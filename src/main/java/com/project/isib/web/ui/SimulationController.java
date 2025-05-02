package com.project.isib.web.ui;

import com.project.isib.model.MolarMass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
public class SimulationController {

  // Логирование
  private static final Logger log = LoggerFactory.getLogger(SimulationController.class);

  // Константы и справочные данные

  /** Универсальная газовая постоянная */
  private static final double R = 8.314;

  /**
   * Набор поддерживаемых газов и их молярных масс.
   */
  public static final Map<String, Double> GAS_MOLAR_MASSES_KG_MOL = initializeGasMap();

  private static Map<String, Double> initializeGasMap() {
    Map<String, Double> gasMap = new LinkedHashMap<>();
    gasMap.put("He", 0.00400);
    gasMap.put("N2", 0.02801);
    gasMap.put("O2", 0.03200);
    gasMap.put("Ar", 0.03995);
    gasMap.put("CO2", 0.04401);
    return Collections.unmodifiableMap(gasMap);
  }

  // MVC View — страница лабораторной

  /**
   * Отдаёт HTML‑страницу виртуальной лаборатории.
   */
  @GetMapping("/gas_simulation")
  public String showSimulationPage(Model model) {
    log.info("Отображение страницы лабораторной");
    model.addAttribute("gasMap", GAS_MOLAR_MASSES_KG_MOL);
    return "virtual_lab";
  }

  // API 1 — Расчёт конечной массы m₂

  /**
   * Эндпойнт <code>/calculate_final_mass</code>: расчёт конечной массы шара.
   * Возвращает JSON с ключом <code>final_mass_g</code>.
   */
  @PostMapping("/calculate_final_mass")
  @ResponseBody
  public ResponseEntity<Map<String, Object>> calculateFinalMass(
      @RequestParam String gasId,
      @RequestParam double m1,
      @RequestParam double P1,
      @RequestParam double P2,
      @RequestParam double V,
      @RequestParam("T") double T_celsius) {

    log.info("/calculate_final_mass: gasId={}, m1={}, P1={}, P2={}, V={}, T={}", gasId, m1, P1, P2, V, T_celsius);
    Map<String, Object> response = new HashMap<>();

    try {
      Double molarMassKgMol = GAS_MOLAR_MASSES_KG_MOL.get(gasId);
      if (molarMassKgMol == null) {
        log.warn("Неизвестный gasId: {}", gasId);
        response.put("message", "Выбран неизвестный газ: " + gasId);
        return ResponseEntity.badRequest().body(response);
      }

      // --- Валидация входных данных
      double tempKelvin = T_celsius + 273.15;
      if (tempKelvin <= 0) throw new IllegalArgumentException("Температура должна быть > -273.15 °C.");
      if (V <= 0) throw new IllegalArgumentException("Объём V должен быть > 0.");
      if (P2 <= P1) throw new IllegalArgumentException("P₂ (" + P2 + ") должно быть > P₁ (" + P1 + ").");
      if (m1 < 0) throw new IllegalArgumentException("Начальная масса m₁ ≥ 0.");

      // --- Основной расчёт
      double deltaM_kg = (molarMassKgMol * (P2 - P1) * V) / (R * tempKelvin);
      if (deltaM_kg < 0) throw new ArithmeticException("Δm отрицательно: " + deltaM_kg);

      double m2_g = (m1 / 1000.0 + deltaM_kg) * 1000.0;
      if (Double.isNaN(m2_g) || Double.isInfinite(m2_g) || m2_g < 0)
        throw new ArithmeticException("Некорректное значение m₂: " + m2_g);

      log.info("Финальная масса m₂ = {} г", String.format("%.3f", m2_g));
      response.put("final_mass_g", m2_g);
      return ResponseEntity.ok(response);

    } catch (IllegalArgumentException | ArithmeticException e) {
      log.warn("Ошибка расчёта m₂: {}", e.getMessage());
      response.put("message", e.getMessage());
      return ResponseEntity.badRequest().body(response);
    } catch (Exception e) {
      log.error("Системная ошибка при расчёте m₂", e);
      response.put("message", "Внутренняя ошибка сервера при расчёте m₂.");
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
  }

  // API 2 — Расчёт молярной массы M

  /**
   * Эндпойнт <code>/calculate_molar_mass</code>: принимает JSON‑объект и
   * возвращает рассчитанное значение молярной массы в кг·моль⁻¹.
   */
  @PostMapping("/calculate_molar_mass")
  @ResponseBody
  public ResponseEntity<Map<String, Object>> calculateMolarMass(@RequestBody Map<String, Double> data) {
    log.info("/calculate_molar_mass: keys={}", data.keySet());
    Map<String, Object> response = new HashMap<>();

    try {
      Double m1_g = data.get("m1");
      Double m2_g = data.get("m2");
      Double p1_pa = data.get("p1");
      Double p2_pa = data.get("p2");
      Double v_m3 = data.get("v");
      Double t_celsius = data.get("t");

      // Валидация наличия всех параметров
      if (m1_g == null || m2_g == null || p1_pa == null || p2_pa == null || v_m3 == null || t_celsius == null) {
        log.warn("Недостаточно данных для расчёта M: {}", data.keySet());
        response.put("message", "Отсутствуют необходимые данные для расчёта M.");
        return ResponseEntity.badRequest().body(response);
      }

      // Расчёт через вспомогательный класс
      MolarMass calc = new MolarMass();
      calc.setM1(m1_g);
      calc.setM2(m2_g);
      calc.setP1(p1_pa);
      calc.setP2(p2_pa);
      calc.setV(v_m3);
      calc.setT(t_celsius);

      double molarMassKgMol = calc.calculateMolarMass();
      if (Double.isNaN(molarMassKgMol) || Double.isInfinite(molarMassKgMol) || molarMassKgMol <= 0) {
        String msg = "Рассчитанное значение M некорректно: " + molarMassKgMol;
        log.warn(msg);
        response.put("message", msg);
        return ResponseEntity.badRequest().body(response);
      }

      log.info("Молярная масса M = {} кг/моль", String.format("%.5f", molarMassKgMol));
      response.put("molar_mass_kg_mol", molarMassKgMol);
      return ResponseEntity.ok(response);

    } catch (Exception e) {
      log.error("Системная ошибка при расчёте M", e);
      response.put("message", "Внутренняя ошибка сервера при расчёте M.");
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
  }
}

