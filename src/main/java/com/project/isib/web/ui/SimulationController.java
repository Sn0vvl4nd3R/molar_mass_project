package com.project.isib.web.ui;

import com.project.isib.model.MolarMass;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model;

import java.util.HashMap;
import java.util.Map;

@Controller
public class SimulationController {

  public static final Map<String, Double> GAS_MOLAR_MASSES_KG_MOL = Map.of(
    "He", 0.00400,
    "N2", 0.02801,
    "O2", 0.03200,
    "Ar", 0.03995,
    "CO2", 0.04401
  );

  private static final double R = 8.314;

  @GetMapping("/gas_simulation")
  public String showSimulationPage(Model model) {
    model.addAttribute("gasMap", GAS_MOLAR_MASSES_KG_MOL);
    return "virtual_lab";
  }

  @PostMapping("/calculate_final_mass")
  @ResponseBody
  public ResponseEntity<Map<String, Object>> calculateFinalMass(
    @RequestParam String gasId,
    @RequestParam double m1,
    @RequestParam double P1,
    @RequestParam double P2,
    @RequestParam double V,
    @RequestParam("T") double T_celsius
  ) {
    Map<String, Object> response = new HashMap<>();
    Double molarMassKgMol = GAS_MOLAR_MASSES_KG_MOL.get(gasId);
    double tempKelvin = T_celsius + 273.15;

    double delta_m_kg = (molarMassKgMol * (P2 - P1) * V) / (R * tempKelvin);

    double m1_kg = m1 / 1000.0;
    double m2_kg = m1_kg + delta_m_kg;
    double m2_grams = m2_kg * 1000.0;


    response.put("final_mass_g", m2_grams);
    return ResponseEntity.ok(response);
  }

  @PostMapping("/calculate_molar_mass")
  @ResponseBody
  public ResponseEntity<Map<String, Object>> calculateMolarMass(@RequestBody Map<String, Double> data) {
    Map<String, Object> response = new HashMap<>();
    Double m1_g = data.get("m1");
    Double m2_g = data.get("m2");
    Double p1_pa = data.get("p1");
    Double p2_pa = data.get("p2");
    Double v_m3 = data.get("v");
    Double t_celsius = data.get("t");

    MolarMass molarMassCalculator = new MolarMass();
    molarMassCalculator.setM1(m1_g);
    molarMassCalculator.setM2(m2_g);
    molarMassCalculator.setP1(p1_pa);
    molarMassCalculator.setP2(p2_pa);
    molarMassCalculator.setV(v_m3);
    molarMassCalculator.setT(t_celsius);

    double molarMassKgMol = molarMassCalculator.calculateMolarMass();
    response.put("molar_mass_kg_mol", molarMassKgMol);
    return ResponseEntity.ok(response);
  }
}
