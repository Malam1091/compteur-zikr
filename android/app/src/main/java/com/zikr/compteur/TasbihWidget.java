package com.zikr.compteur;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.widget.RemoteViews;

/** Widget d'écran d'accueil : affiche le zikr en cours et compte +1 sans ouvrir l'application. */
public class TasbihWidget extends AppWidgetProvider {
    static final String PREFS = "tasbih_widget";
    static final String ACTION_PLUS = "com.zikr.compteur.WIDGET_PLUS";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, views(ctx));
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_PLUS.equals(intent.getAction())) {
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            int target = p.getInt("target", 0), cur = p.getInt("cur", 0), rounds = p.getInt("rounds", 0);
            int total = p.getInt("total", 0), pending = p.getInt("pending", 0);
            cur++; total++; pending++;
            boolean lap = false;
            if (target > 0 && cur >= target) { cur = 0; rounds++; lap = true; }
            p.edit().putInt("cur", cur).putInt("rounds", rounds).putInt("total", total).putInt("pending", pending).apply();
            vibrate(ctx, lap ? 350 : 30);
            refreshAll(ctx);
        }
    }

    static void vibrate(Context ctx, int ms) {
        try {
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(ms);
        } catch (Exception ignored) {}
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TasbihWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, views(ctx));
    }

    static RemoteViews views(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String title = p.getString("title", "Compteur libre");
        int target = p.getInt("target", 0), cur = p.getInt("cur", 0), rounds = p.getInt("rounds", 0), total = p.getInt("total", 0);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_tasbih);
        v.setTextViewText(R.id.w_title, title);
        v.setTextViewText(R.id.w_count, String.valueOf(target > 0 ? cur : total));
        v.setTextViewText(R.id.w_sub, target > 0 ? ("/ " + target + " · tour " + (rounds + 1)) : ("total " + total));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Intent plus = new Intent(ctx, TasbihWidget.class).setAction(ACTION_PLUS);
        v.setOnClickPendingIntent(R.id.w_plus, PendingIntent.getBroadcast(ctx, 1, plus, flags));
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_info, PendingIntent.getActivity(ctx, 2, open, flags));
        return v;
    }
}
