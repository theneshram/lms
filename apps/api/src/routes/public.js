import { Router } from 'express';
import SystemSetting, { defaultPalettes } from '../models/SystemSetting.js';
import { asyncHandler } from '../utils/error.js';

const router = Router();

const googleFontOptions = [
  'Inter',
  'Poppins',
  'Roboto',
  'Nunito',
  'Lato',
  'Source Sans Pro',
  'Space Grotesk',
  'Plus Jakarta Sans',
  'Montserrat',
];

router.get(
  '/appearance',
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.getSingleton();
    const appearance = settings.appearance ?? {};
    const palettes = appearance.palettes?.length ? appearance.palettes : defaultPalettes;
    const activePalette = palettes.find((p) => p.id === appearance.activePaletteId) || palettes[0];
    res.json({
      themeMode: appearance.themeMode ?? 'SYSTEM',
      allowUserToggle: appearance.allowUserToggle !== false,
      palette: activePalette,
      palettes,
      typography: appearance.typography,
      header: appearance.header,
      footer: appearance.footer,
    });
  })
);

router.get(
  '/theme/palettes',
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.getSingleton();
    res.json({ palettes: settings.appearance?.palettes?.length ? settings.appearance.palettes : defaultPalettes });
  })
);

router.get(
  '/fonts/google',
  asyncHandler(async (req, res) => {
    res.json({ fonts: googleFontOptions });
  })
);

export default router;
