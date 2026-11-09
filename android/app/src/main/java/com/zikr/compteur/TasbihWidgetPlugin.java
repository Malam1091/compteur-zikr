package com.zikr.compteur;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Échange entre l'application et le widget d'écran d'accueil. */
@CapacitorPlugin(name = "TasbihWidget")
public class TasbihWidgetPlugin extends Plugin {
    private SharedPreferences prefs() { return getContext().getSharedPreferences(TasbihWidget.PREFS, Context.MODE_PRIVATE); }

    @PluginMethod
    public void update(PluginCall call) {
        prefs().edit()
            .putString("title", call.getString("title", "Compteur libre"))
            .putInt("target", call.getInt("target", 0))
            .putInt("cur", call.getInt("cur", 0))
            .putInt("rounds", call.getInt("rounds", 0))
            .putInt("total", call.getInt("total", 0))
            .apply();
        TasbihWidget.refreshAll(getContext());
        call.resolve();
    }

    /** Renvoie les appuis faits sur le widget depuis la dernière lecture, puis les remet à zéro. */
    @PluginMethod
    public void take(PluginCall call) {
        int n = prefs().getInt("pending", 0);
        prefs().edit().putInt("pending", 0).apply();
        JSObject r = new JSObject();
        r.put("taps", n);
        call.resolve(r);
    }
}
