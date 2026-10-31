# Pixel Tiles

Drop in a picture and the page splits it into **nine 2×2 tiles**
(LEGO®-compatible, 3 × 3 tiles, about 47.8 × 47.8 mm) that you press onto a
baseplate. The output is a multi-colour **3MF for Snapmaker Orca**
(Snapmaker U1, four toolheads), plus one STL per colour and a PNG template.
Everything runs in the browser; the picture never leaves your computer.

## Usage

1. Drag in, paste (Ctrl+V) or pick a picture. A large artwork as a PNG with a
   transparent background works best; plain backgrounds are cut out.
2. The page finds the hues by itself. Clicking a colour swatch and setting it
   to your own filament fixes that colour; everything is then reassigned.
3. The brush lets you touch up single spots (Ctrl+Z to undo).
4. Download the 3MF and open it in Snapmaker Orca; the picture side lies on
   the bed. Layer height 0.2 mm.

The 3D preview loads three.js (r128) from cdnjs the first time it opens.

## How the colours are found

- **Outlines first.** Anything dark, rather grey and no wider than about
  1.2 mm counts as an outline. Wide dark areas (shadows) and strongly
  coloured dark spots stay normal colours. Detection is set high by default
  and can be adjusted with a slider.
- **Hue before lightness.** In Lab colour space lightness counts only half,
  so light, shadow and highlights stay with the same hue.
- **Dominant hues.** First 16 fine groups (k-means), then the two most
  similar are merged until as many remain as there are filaments. Small areas
  give way a little more easily, but a clearly different hue such as red
  eyes survives.

## Outlines as grooves

Instead of using a separate black filament, outlines are recessed
0.2–0.6 mm into the picture side. The groove floor is printed in the darkest
filament (or one you choose), and the shadow in the groove makes the line
look darker still. That keeps all four filaments free for area colours.
Printed picture side down, the groove stays empty in the first layers and is
bridged afterwards.

## Geometry

- 15.8 × 15.8 × 3.2 mm, top 1.2 mm, of which 0.6 mm is the colour layer
  (3 layers).
- Wall 1.2 mm, centre tube Ø 6.51 / 4.8 mm.
- **Clutch ribs:** eight ribs on the inner wall, two per stud, reach 0.1 mm
  past the stud edge by default. Without them the walls do not touch the
  studs (0.3 mm gap) and the tile only grips on the tube, which is too loose
  in FDM printing. The **fit test** produces four plain tiles with
  +0.05 / +0.10 / +0.15 / +0.20 mm, marked with 1–4 dots.
- Colour areas come from a 0.1 mm grid via marching squares, simplified
  (Douglas-Peucker, 0.04 mm) and triangulated with earcut. Specks smaller
  than the nozzle are removed beforehand.

## 3MF

Laid out the way Snapmaker Orca 2.4 saves files: one object file per tile in
`3D/Objects/`, parts with their filament assignment in
`Metadata/model_settings.config`. Checked: all parts are closed solids and
the colour parts fill every tile without gaps.

## Status

Not yet checked is the print itself: how firmly the tiles hold, how dark the
grooves look, and whether Orca assigns the filaments correctly on opening.

## Licence of the embedded library

earcut 2.2.4 (ISC, © Mapbox) is embedded in `index.html`.
