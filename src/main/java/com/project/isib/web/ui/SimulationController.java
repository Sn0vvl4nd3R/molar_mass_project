package com.project.isib.web.ui;

import com.project.isib.model.MolarMass;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Controller
public class SimulationController {

    @GetMapping("/gas_simulation")
    public String showCalculationPage() {
        return "molar_calculator";
    }

    @PostMapping("/calculate_molar_mass")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> calculateMolarMass(@RequestBody Map<String, Double> data) {
         Map<String, Object> response = new HashMap<>();
         try {
            Double m1 = data.get("m1");
            Double m2 = data.get("m2");
            Double p1 = data.get("p1");
            Double p2 = data.get("p2");
            Double v = data.get("v");
            Double t = data.get("t");

            if (m1 == null || m2 == null || p1 == null || p2 == null || v == null || t == null) {
                response.put("message", "Отсутствуют необходимые данные для расчета M.");
                return ResponseEntity.badRequest().body(response);
            }

            MolarMass molarMassCalculator = new MolarMass();
            molarMassCalculator.setM1(m1);
            molarMassCalculator.setM2(m2);
            molarMassCalculator.setP1(p1);
            molarMassCalculator.setP2(p2);
            molarMassCalculator.setV(v);
            molarMassCalculator.setT(t);

            double molarMassKgMol = molarMassCalculator.calculateMolarMass();

            if (Double.isNaN(molarMassKgMol)) {
                 response.put("message", "Не удалось рассчитать молярную массу. Проверьте корректность данных (например, P1≥P2, V=0, T≤ -273.15, m1≥m2).");
                 return ResponseEntity.badRequest().body(response);
            }

            response.put("molar_mass_kg_mol", molarMassKgMol);
            return ResponseEntity.ok(response);

         } catch (Exception e) {
            System.err.println("Неожиданная ошибка сервера при расчете M: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "Внутренняя ошибка сервера при расчете M.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
