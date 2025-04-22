package com.project.isib.model;

public class MolarMass {

  private double M1_g;
  private double M2_g;
  private double P1_pa;
  private double P2_pa;
  private double V_m3;
  private double T_celsius;
  private final double R = 8.314;

  public MolarMass() {}

  public void setM1(double M1) { this.M1_g = M1; }
  public void setM2(double M2) { this.M2_g = M2; }
  public void setP1(double P1) { this.P1_pa = P1; }
  public void setP2(double P2) { this.P2_pa = P2; }
  public void setV(double V) { this.V_m3 = V; }
  public void setT(double T) { this.T_celsius = T; }

  public double calculateMolarMass() {
    double deltaM_kg = (M2_g - M1_g) / 1000.0;
    double tempKelvin = T_celsius + 273.15;
    double deltaP_pa = P2_pa - P1_pa;

    double molarMass_kg_mol = (deltaM_kg * R * tempKelvin) / (deltaP_pa * V_m3);

    return molarMass_kg_mol;
  }
}
