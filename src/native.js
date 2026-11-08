import { Capacitor, registerPlugin } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Haptics } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

// Horaires de prière calculés sur le téléphone (sans internet)
window.ZikrPrayer = {
  times(lat, lon, method, date) {
    const m = (CalculationMethod[method] || CalculationMethod.MuslimWorldLeague)();
    m.madhab = Madhab.Shafi;
    const t = new PrayerTimes(new Coordinates(lat, lon), date || new Date(), m);
    return { fajr: t.fajr, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
  }
};

const VolumeKeys = registerPlugin('VolumeKeys');
const hex = v => Array.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)).map(x => x.toString(16).padStart(2, '0')).join(' ');

window.ZikrNative = {
  isNative: Capacitor.isNativePlatform(),
  // ---- Service au premier plan (écran éteint) ----
  _bgOn: false,
  async startBg(title, body, onStop) {
    try {
      await ForegroundService.requestPermissions();
      if (!this._bgL) {
        this._bgL = true;
        await ForegroundService.addListener('buttonClicked', e => { if (e.buttonId === 1) onStop(); });
        await ForegroundService.addListener('notificationTapped', () => ForegroundService.moveToForeground());
      }
      await ForegroundService.startForegroundService({ id: 7, title, body, smallIcon: 'ic_stat_tasbih', silent: true, buttons: [{ title: 'Arrêter', id: 1 }] });
      this._bgOn = true; return true;
    } catch (e) { return false; }
  },
  async updateBg(title, body) {
    if (!this._bgOn) return;
    try { await ForegroundService.updateForegroundService({ id: 7, title, body, smallIcon: 'ic_stat_tasbih', silent: true, buttons: [{ title: 'Arrêter', id: 1 }] }); } catch (e) {}
  },
  async stopBg() { if (!this._bgOn) return; this._bgOn = false; try { await ForegroundService.stopForegroundService(); } catch (e) {} },

  // ---- Sauvegarde ----
  async saveBackup(name, json) {
    const r = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Sauvegarde Tasbih', text: 'Sauvegarde Tasbih', files: [r.uri] });
  },

  // ---- Position (pour les horaires de prière) ----
  async position() {
    try { await Geolocation.requestPermissions({ permissions: ['coarseLocation'] }); } catch (e) {}
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 3600000 });
    return { lat: p.coords.latitude, lon: p.coords.longitude };
  },

  // ---- Rappels aux heures de prière : items = [{id, at(Date), body}] (identifiants 200 à 299) ----
  async setPrayerReminders(items) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return false;
      const pend = await LocalNotifications.getPending();
      const old = pend.notifications.filter(n => n.id >= 200 && n.id < 300);
      if (old.length) await LocalNotifications.cancel({ notifications: old.map(n => ({ id: n.id })) });
      if (items.length) await LocalNotifications.schedule({ notifications: items.map(i => ({ id: i.id, title: 'Tasbih', body: i.body, schedule: { at: i.at, allowWhileIdle: true } })) });
      return true;
    } catch (e) { return false; }
  },

  async copy(text) { await Clipboard.write({ string: text }); },
  async share(text) { await Share.share({ title: 'Journal Tasbih', text }); },
  async vibrate(ms) { try { await Haptics.vibrate({ duration: ms }); } catch (e) {} },

  // Boutons de volume : +1 / -1
  _volHandle: null,
  async setVolumeKeys(enabled, cb) {
    try {
      await VolumeKeys.setEnabled({ enabled });
      if (this._volHandle) { await this._volHandle.remove(); this._volHandle = null; }
      if (enabled) this._volHandle = await VolumeKeys.addListener('volume', e => cb(e.dir));
    } catch (e) {}
  },

  // Rappels quotidiens : times = ["07:30", "21:00"]
  async setReminders(times, label) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return false;
      const pend = await LocalNotifications.getPending();
      const old = pend.notifications.filter(n => n.id >= 100 && n.id < 200);
      if (old.length) await LocalNotifications.cancel({ notifications: old.map(n => ({ id: n.id })) });
      const notifications = times.map((t, i) => {
        const [h, m] = t.split(':').map(Number);
        return { id: 100 + i, title: 'Tasbih', body: label || "C'est l'heure de votre zikr", schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } };
      });
      if (notifications.length) await LocalNotifications.schedule({ notifications });
      return true;
    } catch (e) { return false; }
  },

  // Recherche des bagues à proximité (liste personnalisée avec les noms donnés)
  async scan(onFound, ms) {
    await BleClient.initialize({ androidNeverForLocation: false });
    try { await BleClient.stopLEScan(); } catch (e) {}
    await BleClient.requestLEScan({ allowDuplicates: false }, r => {
      const name = (r.device && r.device.name) || r.localName || '';
      onFound({ id: r.device.deviceId, name, rssi: r.rssi });
    });
    this._scanT = setTimeout(() => this.stopScan(), ms || 8000);
  },
  async stopScan() { clearTimeout(this._scanT); try { await BleClient.stopLEScan(); } catch (e) {} },
  async connectId(id, name, onPacket, onDisconnect, log) {
    await this.stopScan();
    const dev = { deviceId: id, name };
    log('Connexion à ' + (name || id));
    await BleClient.connect(id, () => { this.stopKeepAlive(); onDisconnect(dev); }, { timeout: 10000 });
    await this.fast(dev, log);
    await this.subscribe(dev, onPacket, log);
    this.startKeepAlive(dev, log);
    return dev;
  },
  // Bague Bluetooth (sélecteur Android)
  async connect(onPacket, onDisconnect, log) {
    await BleClient.initialize({ androidNeverForLocation: false });
    const dev = await BleClient.requestDevice({});
    log('Appareil choisi : ' + (dev.name || dev.deviceId));
    await BleClient.connect(dev.deviceId, () => { this.stopKeepAlive(); onDisconnect(dev); });
    await this.fast(dev, log);
    await this.subscribe(dev, onPacket, log);
    this.startKeepAlive(dev, log);
    return dev;
  },
  async reconnect(dev, onPacket, onDisconnect, log) {
    await BleClient.connect(dev.deviceId, () => { this.stopKeepAlive(); onDisconnect(dev); }, { timeout: 8000 });
    await this.fast(dev, log);
    await this.subscribe(dev, onPacket, log);
    this.startKeepAlive(dev, log);
  },
  // Liaison rapide : réduit la latence entre la bague et l'application
  async fast(dev, log) {
    try { await BleClient.requestConnectionPriority(dev.deviceId, 1); log('Mode rapide activé'); } catch (e) { log('Mode rapide indisponible : ' + e.message); }
  },
  async disconnect(dev) { this.stopKeepAlive(); try { await BleClient.disconnect(dev.deviceId); } catch (e) {} },
  _ka: null, _readable: null,
  startKeepAlive(dev, log) {
    this.stopKeepAlive();
    if (!this._readable) return;
    const [sv, ch] = this._readable;
    this._ka = setInterval(async () => {
      try { await BleClient.read(dev.deviceId, sv, ch, { timeout: 3000 }); } catch (e) {}
    }, 8000);
    log('Maintien de connexion actif');
  },
  stopKeepAlive() { if (this._ka) { clearInterval(this._ka); this._ka = null; } },
  async subscribe(dev, onPacket, log) {
    const services = await BleClient.getServices(dev.deviceId);
    if (!services.length) log('Aucun service trouvé sur la bague.');
    this._readable = null;
    for (const s of services) {
      log('Service ' + s.uuid);
      for (const c of s.characteristics) {
        const p = c.properties || {};
        log('  car. ' + c.uuid + ' [' + (p.notify ? 'notify ' : '') + (p.indicate ? 'indicate ' : '') + (p.read ? 'read ' : '') + (p.write || p.writeWithoutResponse ? 'write' : '') + ']');
        if (p.notify || p.indicate) {
          try {
            await BleClient.startNotifications(dev.deviceId, s.uuid, c.uuid, v =>
              onPacket(c.uuid, new Uint8Array(v.buffer, v.byteOffset, v.byteLength)));
          } catch (e) { log('   notif. refusée : ' + e.message); }
        }
        if (p.read) {
          if (!this._readable || c.uuid.startsWith('00002a19')) this._readable = [s.uuid, c.uuid];
          if (!(p.notify || p.indicate)) { try { log('   lu : ' + hex(await BleClient.read(dev.deviceId, s.uuid, c.uuid))); } catch (e) {} }
        }
      }
    }
  }
};
