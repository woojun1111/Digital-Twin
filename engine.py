"""Educational, quasi-steady separate-flow turbofan. SI units throughout.

Read docs/model.md before interpreting results. No real engine calibration.
"""
from dataclasses import dataclass, asdict
from math import isfinite, sqrt

CP = 1004.5
GAMMA = 1.4
R = 287.0
LHV = 43_000_000.0
BPR = 5.0
ETA_B = 0.99
ETA_M = 0.99
ETA_T = 0.91


@dataclass(frozen=True)
class Controls:
    power: float = 0.75
    altitude_m: float = 0.0
    mach: float = 0.0
    compressor_loss: float = 0.0

    def validate(self):
        for name, low, high in [("power", .2, 1), ("altitude_m", 0, 11000),
                                ("mach", 0, .85), ("compressor_loss", 0, .15)]:
            value = getattr(self, name)
            if not isfinite(value) or not low <= value <= high:
                raise ValueError(f"{name} must be finite and within [{low}, {high}]")


@dataclass(frozen=True)
class Result:
    controls: Controls
    temperatures_k: tuple
    pressures_pa: tuple
    core_flow_kg_s: float
    fuel_flow_kg_s: float
    fuel_air_ratio: float
    thrust_n: float
    core_thrust_n: float
    bypass_thrust_n: float
    shaft_work_j_kg: float
    compressor_efficiency: float

    def row(self):
        row = asdict(self.controls)
        row.update(thrust_n=self.thrust_n, core_thrust_n=self.core_thrust_n,
                   bypass_thrust_n=self.bypass_thrust_n,
                   fuel_flow_kg_s=self.fuel_flow_kg_s,
                   core_flow_kg_s=self.core_flow_kg_s,
                   compressor_efficiency=self.compressor_efficiency)
        for name, temperature, pressure in zip(
                ["inlet", "fan", "compressor", "burner", "turbine"],
                self.temperatures_k, self.pressures_pa):
            row[f"{name}_total_temperature_k"] = temperature
            row[f"{name}_total_pressure_pa"] = pressure
        return row


def atmosphere(altitude_m):
    """ISA troposphere approximation, 0–11 km; no weather correction."""
    temperature = 288.15 - .0065 * altitude_m
    pressure = 101325 * (temperature / 288.15) ** (9.80665 / (R * .0065))
    return temperature, pressure


def nozzle_velocity(temperature, total_pressure, ambient_pressure):
    """Ideal fully expanded variable-area nozzle, with velocity efficiency.

    No fixed throat, area matching or choking prediction. Pressure thrust is
    zero by the imposed exit pressure = ambient assumption.
    """
    if total_pressure <= ambient_pressure:
        raise ValueError("Insufficient nozzle total pressure for this model")
    return sqrt(2 * CP * temperature * .97 *
                (1 - (ambient_pressure / total_pressure) ** ((GAMMA - 1) / GAMMA)))


def simulate(controls=Controls()):
    controls.validate()
    u, h, mach, loss = (controls.power, controls.altitude_m,
                        controls.mach, controls.compressor_loss)
    ta, pa = atmosphere(h)
    v0 = mach * sqrt(GAMMA * R * ta)
    t2 = ta * (1 + (GAMMA - 1) / 2 * mach**2)
    p2 = pa * (t2 / ta)**(GAMMA / (GAMMA - 1)) * .99
    # These schedules are illustrative assumptions, not measured engine maps.
    fpr, cpr = 1.08 + .42 * u, 3 + 12 * u
    eta_c = .88 * (1 - loss)
    t13 = t2 * (1 + (fpr**((GAMMA - 1) / GAMMA) - 1) / .90)
    p13 = p2 * fpr
    t3 = t13 * (1 + (cpr**((GAMMA - 1) / GAMMA) - 1) / eta_c)
    p3 = p13 * cpr
    t4 = 1000 + 500 * u
    p4 = p3 * .95
    f = CP * (t4 - t3) / (ETA_B * LHV - CP * t4)
    if f <= 0:
        raise ValueError("Combustor inlet exceeds commanded exit temperature")
    shaft_work = CP * ((t3 - t13) + (1 + BPR) * (t13 - t2))
    t5 = t4 - shaft_work / ((1 + f) * CP * ETA_M)
    pressure_base = 1 - (t4 - t5) / (ETA_T * t4)
    if t5 <= 0 or pressure_base <= 0:
        raise ValueError("Insufficient turbine work")
    p5 = p4 * pressure_base**(GAMMA / (GAMMA - 1))
    ve = nozzle_velocity(t5, p5, pa)
    vb = nozzle_velocity(t13, p13, pa)
    core_flow = 20 * (.5 + .5 * u) * (p2 / 101325) / sqrt(t2 / 288.15)
    core_thrust = core_flow * ((1 + f) * ve - v0)
    bypass_thrust = BPR * core_flow * (vb - v0)
    return Result(controls, (t2, t13, t3, t4, t5), (p2, p13, p3, p4, p5),
                  core_flow, f * core_flow, f, core_thrust + bypass_thrust,
                  core_thrust, bypass_thrust, shaft_work, eta_c)
