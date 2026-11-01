package co.zan.zanreader;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ZanOpenPlugin.class);
        super.onCreate(savedInstanceState);
        if (savedInstanceState == null) {
            ZanOpenPlugin.clean(this);
            ZanOpenPlugin.ingest(this, getIntent());
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        ZanOpenPlugin.ingest(this, intent);
    }
}
