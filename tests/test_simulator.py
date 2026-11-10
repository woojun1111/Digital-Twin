import csv
import os
import tempfile
import unittest
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
from simulator import EngineLab, power_sweep


class SimulatorTests(unittest.TestCase):
    def test_controls_animation_reset_and_export(self):
        lab = EngineLab()
        try:
            original = lab.result.thrust_n
            lab.sliders["compressor_loss"].set_val(.1)
            self.assertLess(lab.result.thrust_n, original)
            phase = lab.phase
            lab.tick(1)
            self.assertGreater(lab.phase, phase)
            lab.toggle(None)
            phase = lab.phase
            lab.tick(2)
            self.assertEqual(lab.phase, phase)
            lab.reset(None)
            self.assertEqual(lab.result.controls.compressor_loss, 0)
            with tempfile.TemporaryDirectory() as folder:
                previous = Path.cwd()
                try:
                    os.chdir(folder)
                    lab.export(None)
                    files = list(Path("results").glob("*.csv"))
                    self.assertEqual(len(files), 1)
                    with files[0].open() as file:
                        rows = list(csv.DictReader(file))
                    self.assertEqual(len(rows), len(lab.history))
                    lab.fig.savefig("view.png")
                    self.assertGreater(Path("view.png").stat().st_size, 10000)
                finally:
                    os.chdir(previous)
        finally:
            lab.plt.close(lab.fig)

    def test_sweep_exports_both_conditions(self):
        with tempfile.TemporaryDirectory() as folder:
            rows = power_sweep(Path(folder) / "sweep.csv")
            self.assertEqual(len(rows), 34)
            self.assertEqual({r["compressor_loss"] for r in rows}, {0, .1})


if __name__ == "__main__":
    unittest.main()
