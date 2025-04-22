package com.project.isib.web.ui;

import com.project.isib.model.MolarMass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model; // Импортируем Model

import java.util.HashMap;
import java.util.Map;
import java.util.Collections; // Для unmodifiableMap

@Controller
public class SimulationController {

    private static final Logger log = LoggerFactory.getLogger(SimulationController.class);

    // Сделаем карту неизменяемой и публичной, чтобы использовать ее в Thymeleaf
    public static final Map<String, Double> GAS_MOLAR_MASSES_KG_MOL = Collections.unmodifiableMap(Map.of(
        "He", 0.00400,   // Гелий
        "N2", 0.02801,   // Азот
        "O2", 0.03200,   // Кислород
        "Ar", 0.03995,   // Аргон
        "CO2", 0.04401  // Углекислый газ
    ));

    private static final double R = 8.314; // Дж/(моль*К)

    @GetMapping("/gas_simulation")
    public String showSimulationPage(Model model) { // Добавляем Model
        // Передаем список газов в HTML-шаблон
        model.addAttribute("gasMap", GAS_MOLAR_MASSES_KG_MOL);
        return "virtual_lab"; // Имя HTML файла без расширения
    }

    /**
     * Рассчитывает конечную массу m2 после "накачки" выбранным газом.
     */
    @PostMapping("/calculate_final_mass")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> calculateFinalMass(
        @RequestParam String gasId,     // ID выбранного газа
        @RequestParam double m1,        // Начальная масса, г
        @RequestParam double P1,        // Начальное давление, Па
        @RequestParam double P2,        // Конечное давление, Па
        @RequestParam double V,         // Объем, м³
        @RequestParam("T") double T_celsius // Температура, °C
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            Double molarMassKgMol = GAS_MOLAR_MASSES_KG_MOL.get(gasId);
            if (molarMassKgMol == null) {
                log.warn("Попытка рассчитать m2 для неизвестного газа: {}", gasId);
                response.put("message", "Выбран неизвестный газ: " + gasId);
                return ResponseEntity.badRequest().body(response);
            }
            log.info("Расчет m2 для газа: {}, M = {} кг/моль", gasId, molarMassKgMol);

            double tempKelvin = T_celsius + 273.15;

            // Валидация входных данных
            if (tempKelvin <= 0) {
                throw new IllegalArgumentException("Температура должна быть выше абсолютного нуля (> -273.15 °C).");
            }
            if (V <= 0) {
                throw new IllegalArgumentException("Объем (V) должен быть положительным.");
            }
            if (P2 <= P1) {
                throw new IllegalArgumentException("Конечное давление (P2) должно быть больше начального (P1).");
            }
            if (m1 < 0) {
                 throw new IllegalArgumentException("Начальная масса (m1) не может быть отрицательной.");
            }

            // Расчет добавленной массы (delta_m) по уравнению состояния идеального газа
            // PV = (m/M)RT -> m = (M * P * V) / (R * T)
            // delta_m = m2 - m1 = (M * P2 * V) / (R * T) - (M * P1 * V) / (R * T)
            // delta_m = (M * V * (P2 - P1)) / (R * T)
            double delta_m_kg = (molarMassKgMol * (P2 - P1) * V) / (R * tempKelvin);

            // Переводим начальную массу в кг
            double m1_kg = m1 / 1000.0;
            // Рассчитываем конечную массу в кг
            double m2_kg = m1_kg + delta_m_kg;
            // Переводим конечную массу обратно в граммы для ответа
            double m2_grams = m2_kg * 1000.0;

            // Проверка результата расчета
            if (Double.isNaN(m2_grams) || Double.isInfinite(m2_grams) || m2_grams < 0) {
                throw new ArithmeticException("Результат расчета m2 некорректен (NaN, Infinity или отрицательное значение). Проверьте входные данные.");
            }

            response.put("final_mass_g", m2_grams);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException | ArithmeticException e) {
            log.error("Ошибка валидации или расчета m2: {}", e.getMessage());
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("Неожиданная ошибка сервера при расчете m2", e);
            response.put("message", "Внутренняя ошибка сервера при расчете m2.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Рассчитывает молярную массу M на основе "измеренных" данных.
     */
    @PostMapping("/calculate_molar_mass")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> calculateMolarMass(@RequestBody Map<String, Double> data) {
         Map<String, Object> response = new HashMap<>();
         try {
            // Получаем данные из тела запроса (JSON)
            Double m1_g = data.get("m1");
            Double m2_g = data.get("m2");
            Double p1_pa = data.get("p1");
            Double p2_pa = data.get("p2");
            Double v_m3 = data.get("v");
            Double t_celsius = data.get("t");

            // Проверка наличия всех необходимых данных
            if (m1_g == null || m2_g == null || p1_pa == null || p2_pa == null || v_m3 == null || t_celsius == null) {
                response.put("message", "Отсутствуют необходимые данные для расчета M.");
                return ResponseEntity.badRequest().body(response);
            }

            // Используем модель MolarMass для расчета
            MolarMass molarMassCalculator = new MolarMass();
            molarMassCalculator.setM1(m1_g);
            molarMassCalculator.setM2(m2_g);
            molarMassCalculator.setP1(p1_pa);
            molarMassCalculator.setP2(p2_pa);
            molarMassCalculator.setV(v_m3);
            molarMassCalculator.setT(t_celsius);

            double molarMassKgMol = molarMassCalculator.calculateMolarMass();

            // Проверяем результат расчета из модели
            if (Double.isNaN(molarMassKgMol)) {
                 log.warn("Расчет M вернул NaN для данных: m1={}, m2={}, p1={}, p2={}, v={}, t={}",
                     m1_g, m2_g, p1_pa, p2_pa, v_m3, t_celsius);
                 response.put("message", "Не удалось рассчитать молярную массу. Проверьте корректность данных (например, P1≥P2, V=0, T≤-273.15, m1≥m2).");
                 return ResponseEntity.badRequest().body(response);
            }
            if (molarMassKgMol <= 0 || Double.isInfinite(molarMassKgMol)) {
                 log.warn("Расчет M дал некорректный результат (<=0 или Infinity): {} кг/моль", molarMassKgMol);
                 response.put("message", "Рассчитанное значение молярной массы некорректно (<= 0 или бесконечность).");
                 return ResponseEntity.badRequest().body(response);
            }

            // Возвращаем результат в кг/моль (стандартная единица СИ для молярной массы)
            // или можно перевести в г/моль для отображения, если удобнее
            // double molarMassGramsMol = molarMassKgMol * 1000.0;
            response.put("molar_mass_kg_mol", molarMassKgMol);
            // response.put("molar_mass_g_mol", molarMassGramsMol);

            return ResponseEntity.ok(response);

         } catch (Exception e) {
            log.error("Неожиданная ошибка сервера при расчете M", e);
            response.put("message", "Внутренняя ошибка сервера при расчете M.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
