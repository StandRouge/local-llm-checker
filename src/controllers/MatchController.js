import { validateDevice } from '../validators/DeviceInput.js';
import { DeviceProfile } from '../models/DeviceProfile.js';
import { rank } from '../models/Matcher.js';
import { ERROR_MESSAGES } from '../config/messages.js';

export class MatchController {
  constructor({ catalog }) {
    this.catalog = catalog;
  }

  match = (req, res) => {
    const input = validateDevice(req.body);
    if (!input.valid) {
      res.status(400).json({ error: 'validation_failed', message: ERROR_MESSAGES.validation_failed, details: input.errors });
      return;
    }
    const profile = new DeviceProfile(input.value);
    const { results, summary } = rank(profile, this.catalog.all());
    res.json({ device: profile.summary(), summary, results });
  };
}
