"""Run `python simulator.py` for the desktop lab, or --batch for CSV results."""
import argparse
import csv
from pathlib import Path

import numpy as np
from engine import Controls, simulate


def save_rows(path, rows):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def power_sweep(path):
    """Independent equilibrium points; row order is not a dynamic trajectory."""
    rows = []
    for loss in [0, .10]:
        for power in np.linspace(.2, 1, 17):
            rows.append(simulate(Controls(power=float(power), compressor_loss=loss)).row())
    save_rows(path, rows)
    return rows


class EngineLab:
    def __init__(self):
        import matplotlib.pyplot as plt
        from matplotlib.widgets import Slider, Button
        from mpl_toolkits.mplot3d.art3d import Poly3DCollection
        self.plt, self.poly = plt, Poly3DCollection
        plt.style.use("dark_background")
        self.fig = plt.figure(figsize=(15, 9), facecolor="#0b1321")
        self.fig.canvas.manager.set_window_title("Digital-Twin | Turbofan Lab")
        self.fig.text(.055, .95, "TURBOFAN / VIRTUAL ENGINE LAB", fontsize=22, weight="bold")
        self.fig.text(.055, .916, "Concept model  |  Quasi-steady cycle  |  Uncalibrated",
                      color="#9fb2cb", fontsize=11)
        self.ax = self.fig.add_axes([.025, .36, .62, .52], projection="3d")
        self.ax.set_facecolor("#0b1321")
        self.ax.set(xlim=(-.5, 6.6), ylim=(-1.6, 1.6), zlim=(-1.6, 1.6))
        self.ax.set_box_aspect((7.1, 3.2, 3.2))
        self.ax.view_init(elev=18, azim=-65)
        self.ax.set_axis_off()
        # Procedural geometry: dimensionless layout, not engineering CAD.
        self.shell(0, 4.8, 1.3, 1.15, "#73c9e6", .08)
        self.shell(.5, 5.3, .64, .55, "#aec7db", .10)
        self.shell(0, 5.8, .15, .15, "#93a4bc", .9)
        self.shell(2.4, 3.4, .66, .66, "#ff944d", .5)
        self.shell(4.5, 5.8, .55, .36, "#93a4bc", .35)
        self.rotors = []
        for x, radius, count, color in [(.3, 1.23, 18, "#67d6ed"),
                (1.1, .58, 12, "#85b6f1"), (1.6, .55, 12, "#85b6f1"),
                (2.1, .51, 12, "#85b6f1"), (3.65, .59, 12, "#ffbe74"),
                (4.15, .57, 12, "#ffbe74")]:
            collection = self.poly([], facecolors=color, edgecolors="#122239", linewidths=.4)
            self.ax.add_collection3d(collection)
            self.rotors.append((collection, x, radius, count))
        for x, label in [(.2, "FAN"), (1.6, "COMPRESSOR"),
                         (2.9, "BURNER"), (4, "TURBINE"), (5.6, "NOZZLE")]:
            self.ax.text(x, 0, 1.5, label, color="#cbd8e9", fontsize=8, ha="center")
        self.flow, = self.ax.plot([], [], [], ".", color="#66e5cf", markersize=4)
        self.fig.text(.07, .385, "Drag to orbit the 3D view. Rotation / flow are illustrative, not CFD.",
                      color="#9fb2cb", fontsize=9)
        self.temp_ax = self.fig.add_axes([.70, .56, .26, .27])
        self.temp_ax.set_facecolor("#101f31")
        self.temp_line, = self.temp_ax.plot(range(5), [0]*5, "o-", color="#ffaa67")
        self.temp_ax.set_xticks(range(5), ["Inlet", "Fan", "Comp.", "Burner", "Turb."])
        self.temp_ax.set_ylim(0, 1700)
        self.temp_ax.set_ylabel("Total temperature [K]")
        self.temp_ax.grid(alpha=.15)
        self.metrics = self.fig.text(.70, .40, "", fontsize=12, linespacing=1.8)
        self.status = self.fig.text(.055, .045, "Ready | illustrative operating schedules", color="#79d9c1", fontsize=10)
        self.sliders = {}
        specs = [("power", "Power command", .2, 1, .75),
                 ("altitude_m", "Altitude [m]", 0, 11000, 0),
                 ("mach", "Flight Mach", 0, .85, 0),
                 ("compressor_loss", "Comp. efficiency loss", 0, .15, 0)]
        for i, (key, label, low, high, default) in enumerate(specs):
            axis = self.fig.add_axes([.20, .30 - .052*i, .37, .025], facecolor="#21314a")
            slider = Slider(axis, label, low, high, valinit=default, color="#54c9db")
            slider.on_changed(self.update)
            self.sliders[key] = slider
        self.buttons = []
        for label, x, callback in [("Pause / play", .69, self.toggle),
                ("Save CSV", .80, self.export), ("Reset", .90, self.reset)]:
            button = Button(self.fig.add_axes([x, .22, .095, .045]), label,
                            color="#21314a", hovercolor="#34516f")
            button.on_clicked(callback)
            self.buttons.append(button)
        self.running = True
        self.phase = 0.0
        self.history = []
        self.update(None)
        self.tick(0)

    def shell(self, start, end, r1, r2, color, alpha):
        theta = np.linspace(0, 2*np.pi, 32)
        x = np.array([[start]*32, [end]*32])
        radii = np.array([[r1], [r2]])
        self.ax.plot_surface(x, radii*np.cos(theta), radii*np.sin(theta),
                             color=color, alpha=alpha, linewidth=0, shade=True)

    def update(self, _):
        try:
            self.result = simulate(Controls(**{key: float(slider.val)
                                               for key, slider in self.sliders.items()}))
        except ValueError as error:
            self.result = None
            self.temp_line.set_ydata([np.nan]*5)
            self.metrics.set_text("Operating point outside model")
            self.status.set_text(str(error))
            self.fig.canvas.draw_idle()
            return
        r = self.result
        self.history.append({"sample": len(self.history), **r.row()})
        self.temp_line.set_ydata(r.temperatures_k)
        self.metrics.set_text(f"Net thrust       {r.thrust_n/1000:7.2f} kN\n"
                             f"Fuel flow         {r.fuel_flow_kg_s:7.3f} kg/s\n"
                             f"Core air flow    {r.core_flow_kg_s:7.2f} kg/s\n"
                             f"Comp. exit Pt   {r.pressures_pa[2]/1000:7.1f} kPa")
        self.status.set_text("Calculated | conceptual engine, no real-engine calibration")
        self.fig.canvas.draw_idle()

    def tick(self, _):
        if not self.running or self.result is None:
            return
        self.phase += .08 + .18 * self.sliders["power"].val
        for collection, x, radius, count in self.rotors:
            faces = []
            for angle in np.linspace(0, 2*np.pi, count, endpoint=False) + self.phase:
                faces.append([(x, .18*np.cos(angle), .18*np.sin(angle)),
                              (x+.12, radius*np.cos(angle+.15), radius*np.sin(angle+.15)),
                              (x+.22, radius*np.cos(angle+.28), radius*np.sin(angle+.28)),
                              (x+.10, .18*np.cos(angle+.28), .18*np.sin(angle+.28))])
            collection.set_verts(faces)
        xs = (np.arange(40)*.17 + self.phase*.4) % 6.5 - .3
        self.flow.set_data_3d(xs, np.full(40, -.85), np.full(40, .45))

    def toggle(self, _):
        self.running = not self.running

    def reset(self, _):
        for slider in self.sliders.values():
            slider.reset()

    def export(self, _):
        from datetime import datetime
        path = Path("results") / f"session-{datetime.now():%Y%m%d-%H%M%S-%f}.csv"
        try:
            save_rows(path, self.history)
            self.status.set_text(f"Saved {len(self.history)} operating points: {path}")
        except OSError as error:
            self.status.set_text(f"Could not save: {error}")
        self.fig.canvas.draw_idle()

    def show(self):
        from matplotlib.animation import FuncAnimation
        self.animation = FuncAnimation(self.fig, self.tick, interval=80, cache_frame_data=False)
        self.plt.show()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch", action="store_true", help="Write baseline / efficiency-loss sweep CSV")
    parser.add_argument("--snapshot", type=Path, help="Save a static 3D view without opening a window")
    parser.add_argument("--output", type=Path, default=Path("results/power-sweep.csv"))
    args = parser.parse_args()
    if args.batch:
        rows = power_sweep(args.output)
        print(f"Saved {len(rows)} equilibrium points to {args.output}")
    elif args.snapshot:
        import matplotlib
        matplotlib.use("Agg")
        lab = EngineLab()
        args.snapshot.parent.mkdir(parents=True, exist_ok=True)
        lab.fig.savefig(args.snapshot, dpi=140, facecolor=lab.fig.get_facecolor())
    else:
        EngineLab().show()


if __name__ == "__main__":
    main()
