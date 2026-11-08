import { Capacitor, registerPlugin } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Haptics } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

const VolumeKeys = registerPlugin('VolumeKeys');
const hex = v => Array.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)).map(x => x.toString(16).padStart(2, '0')).join(' ');

window.ZikrNative = {
  isNative: Capacitor.isNativePlatform(),
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
      if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
      const notifications = times.map((t, i) => {
        const [h, m] = t.split(':').map(Number);
        return { id: 100 + i, title: 'Tasbih', body: label || "C'est l'heure de votre zikr", schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } };
      });
      if (notifications.length) await LocalNotifications.schedule({ notifications });
      return true;
    } catch (e) { return false; }
  },

  // Bague Bluetooth
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
