package com.project.isib.model;

public class MolarMass {
    private double M1;
    private double M2;
    private double P1;
    private double P2;
    private double V;
    private double T;
    private final double R = 8.314;

    public MolarMass() {}

    public void setM1(double M1) { this.M1 = M1; }
    public void setM2(double M2) { this.M2 = M2; }
    public void setP1(double P1) { this.P1 = P1; }
    public void setP2(double P2) { this.P2 = P2; }
    public void setV(double V) { this.V = V; }
    public void setT(double T) { this.T = T; }

    public double calculateMolarMass() {
        double deltaM_kg = (M2 - M1) / 1000.0;
        double tempKelvin = T + 273.15;
        double deltaP = P2 - P1;

        if (Math.abs(deltaP) < 1e-9 || Math.abs(V) < 1e-9 || tempKelvin <= 0 || deltaM_kg <= 0) {
             System.err.println("Ошибка расчета M: некорректные входные данные (deltaP=" + deltaP + ", V=" + V + ", T(K)=" + tempKelvin + ", deltaM(kg)=" + deltaM_kg + ")");
            return Double.NaN;
        }
        return (deltaM_kg * R * tempKelvin) / (deltaP * V);
    }
}
