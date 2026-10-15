export class HomeController {
  constructor({ catalog }) {
    this.catalog = catalog;
  }

  index = (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.render('pages/index', {
      title: 'Cek Kesiapan Perangkat untuk AI Lokal',
      description: 'Deteksi spesifikasi perangkat langsung di browser lalu temukan model AI lokal yang cocok beserta panduan instalasinya.',
      modelCount: this.catalog.all().length,
      meta: this.catalog.meta(),
      scripts: ['/js/main.js'],
    });
  };
}
