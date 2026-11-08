package com.zikr.compteur;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Permet de compter avec les boutons de volume (+1 / -1)
@CapacitorPlugin(name = "VolumeKeys")
public class VolumeKeysPlugin extends Plugin {
    static VolumeKeysPlugin instance;
    static boolean enabled = false;

    @Override
    public void load() { instance = this; }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        call.resolve();
    }

    void fire(int dir) {
        JSObject o = new JSObject();
        o.put("dir", dir);
        notifyListeners("volume", o);
    }
}
