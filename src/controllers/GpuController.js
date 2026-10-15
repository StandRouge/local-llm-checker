import { validateGpuLookup } from '../validators/DeviceInput.js';
import { ERROR_MESSAGES } from '../config/messages.js';

export class GpuController {
  constructor({ gpuLookup }) {
    this.gpuLookup = gpuLookup;
  }

  resolve = (req, res) => {
    const input = validateGpuLookup(req.body);
    if (!input.valid) {
      res.status(400).json({ error: 'validation_failed', message: ERROR_MESSAGES.validation_failed, details: input.errors });
      return;
    }
    res.json(this.gpuLookup.resolve(input.value.renderer));
  };
}
