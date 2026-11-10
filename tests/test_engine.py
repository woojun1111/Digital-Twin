import math
import unittest
from itertools import product
from engine import Controls, simulate, CP, ETA_M, ETA_B, LHV, atmosphere


class EngineTests(unittest.TestCase):
    def test_sea_level_atmosphere(self):
        self.assertEqual(atmosphere(0), (288.15, 101325))

    def test_energy_balance(self):
        r = simulate()
        _, _, t3, t4, t5 = r.temperatures_k
        f = r.fuel_air_ratio
        self.assertAlmostEqual(CP*t3 + f*ETA_B*LHV, (1+f)*CP*t4, places=7)
        self.assertAlmostEqual((1+f)*CP*(t4-t5)*ETA_M, r.shaft_work_j_kg, places=7)

    def test_thrust_and_fuel_mass(self):
        r = simulate()
        self.assertAlmostEqual(r.thrust_n, r.core_thrust_n + r.bypass_thrust_n)
        self.assertAlmostEqual(r.fuel_flow_kg_s, r.core_flow_kg_s*r.fuel_air_ratio)

    def test_efficiency_loss_increases_compressor_temperature(self):
        healthy = simulate()
        degraded = simulate(Controls(compressor_loss=.1))
        self.assertGreater(degraded.temperatures_k[2], healthy.temperatures_k[2])
        self.assertLess(degraded.thrust_n, healthy.thrust_n)

    def test_power_increases_static_thrust(self):
        values = [simulate(Controls(power=u)).thrust_n for u in [.2, .4, .6, .8, 1]]
        self.assertEqual(values, sorted(values))

    def test_control_grid_is_finite(self):
        for u, h, m, loss in product([.2, .6, 1], [0, 5500, 11000], [0, .425, .85], [0, .075, .15]):
            r = simulate(Controls(u, h, m, loss))
            self.assertTrue(all(math.isfinite(v) for v in r.row().values()))
            self.assertTrue(all(t > 0 for t in r.temperatures_k))
            self.assertGreater(r.fuel_flow_kg_s, 0)

    def test_invalid_inputs(self):
        for controls in [Controls(power=0), Controls(mach=1), Controls(altitude_m=-1),
                         Controls(compressor_loss=.5), Controls(power=float("nan"))]:
            with self.assertRaises(ValueError):
                simulate(controls)


if __name__ == "__main__":
    unittest.main()
