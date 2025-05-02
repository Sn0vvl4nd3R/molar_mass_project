package com.project.isib.model;

public class MolarMass {

  // Входные параметры (private → модифицируются через сеттеры)
  private double M1_g;   // масса до накачки, г
  private double M2_g;   // масса после накачки, г
  private double P1_pa;  // давление до накачки, Па
  private double P2_pa;  // давление после накачки, Па
  private double V_m3;   // объём шара, м³
  private double T_celsius; // температура, °C

  // Константы
  private static final double R = 8.314;

  // Конструкторы
  public MolarMass() {
  }

  // Cеттеры
  public void setM1(double M1) { this.M1_g = M1; }
  public void setM2(double M2) { this.M2_g = M2; }
  public void setP1(double P1) { this.P1_pa = P1; }
  public void setP2(double P2) { this.P2_pa = P2; }
  public void setV(double V) { this.V_m3 = V; }
  public void setT(double T) { this.T_celsius = T; }

  // Основной метод расчёта
  public double calculateMolarMass() {
    // Δm: г → кг
    final double deltaM_kg = (M2_g - M1_g) / 1000.0;
    // T: °C → K
    final double tempKelvin = T_celsius + 273.15;
    // ΔP: Па
    final double deltaP_pa = P2_pa - P1_pa;

    // M = (Δm · R · T) / (ΔP · V)
    return (deltaM_kg * R * tempKelvin) / (deltaP_pa * V_m3);
  }
}
