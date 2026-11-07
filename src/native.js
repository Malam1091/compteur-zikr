import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Haptics } from '@capacitor/haptics';

// Petit pont exposé à la page : Bluetooth et vibration natifs d'Android.
window.ZikrNative = {
  isNative: Capacitor.isNativePlatform(),
  async vibrate(ms) { try { await Haptics.vibrate({ duration: ms }); } catch (e) {} },
  async connect(onPacket, onDisconnect, log) {
    await BleClient.initialize({ androidNeverForLocation: false });
    const dev = await BleClient.requestDevice({});
    log('Appareil choisi : ' + (dev.name || dev.deviceId));
    await BleClient.connect(dev.deviceId, () => onDisconnect(dev));
    await this.subscribe(dev, onPacket, log);
    return dev;
  },
  async reconnect(dev, onPacket, onDisconnect, log) {
    await BleClient.connect(dev.deviceId, () => onDisconnect(dev));
    await this.subscribe(dev, onPacket, log);
  },
  async subscribe(dev, onPacket, log) {
    const services = await BleClient.getServices(dev.deviceId);
    if (!services.length) log('Aucun service trouvé sur la bague.');
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
        } else if (p.read) {
          try {
            const v = await BleClient.read(dev.deviceId, s.uuid, c.uuid);
            log('   lu : ' + Array.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)).map(x => x.toString(16).padStart(2, '0')).join(' '));
          } catch (e) {}
        }
      }
    }
  }
};
