package com.zikr.compteur;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VolumeKeysPlugin.class);
        super.onCreate(savedInstanceState);
        // Garde l'écran allumé pendant le zikr
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int code = event.getKeyCode();
        if (VolumeKeysPlugin.enabled && VolumeKeysPlugin.instance != null
                && (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN)) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                VolumeKeysPlugin.instance.fire(code == KeyEvent.KEYCODE_VOLUME_UP ? 1 : -1);
            }
            return true; // ne change pas le volume
        }
        return super.dispatchKeyEvent(event);
    }
}
