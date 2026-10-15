import { deviceToQuery, parseDeviceQuery } from '../validators/DeviceInput.js';
import { DeviceProfile } from '../models/DeviceProfile.js';
import { evaluate } from '../models/Matcher.js';
import { OS_LABELS, buildGuide, resolveGuideOs } from '../models/InstallGuide.js';

export class ModelController {
  constructor({ catalog }) {
    this.catalog = catalog;
  }

  list = (req, res) => {
    const models = [...this.catalog.all()].sort((a, b) => a.sizeGb - b.sizeGb);
    res.set('Cache-Control', 'no-store');
    res.render('pages/models', {
      title: 'Katalog Model Lokal',
      description: 'Daftar model AI open-weight yang realistis dijalankan secara lokal beserta ukuran unduhannya.',
      models,
      meta: this.catalog.meta(),
      scripts: [],
    });
  };

  show = (req, res, next) => {
    const model = this.catalog.findBySlug(req.params.slug);
    if (model === null) {
      next();
      return;
    }
    const parsed = parseDeviceQuery(req.query);
    const device = parsed.valid ? parsed.value : null;
    const requestedOs = typeof req.query.os === 'string' ? req.query.os : device?.os;
    const guideOs = resolveGuideOs(requestedOs);
    const fit = device === null ? null : evaluate(new DeviceProfile(device), model);
    const tabs = Object.entries(OS_LABELS).map(([os, label]) => ({
      os,
      label,
      active: os === guideOs,
      href: device === null ? `/models/${model.slug}?os=${os}` : `/models/${model.slug}?${deviceToQuery(device, os)}`,
    }));
    res.set('Cache-Control', 'no-store');
    res.render('pages/model-detail', {
      title: model.name,
      description: model.summary,
      model,
      fit,
      device,
      guide: buildGuide(model, guideOs),
      tabs,
      mobileNotice: device !== null && (device.os === 'android' || device.os === 'ios' || device.os === 'other'),
      scripts: ['/js/detail.js'],
    });
  };
}
