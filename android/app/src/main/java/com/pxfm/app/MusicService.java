package com.pxfm.app;

import android.os.Bundle;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.session.MediaSessionCompat;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media.MediaBrowserServiceCompat;
import java.util.ArrayList;
import java.util.List;

public class MusicService extends MediaBrowserServiceCompat {
    private MediaSessionCompat mediaSession;
    private static final String MY_MEDIA_ROOT_ID = "media_root_id";

    @Override
    public void onCreate() {
        super.onCreate();

        // Create a MediaSessionCompat
        mediaSession = new MediaSessionCompat(this, "MusicService");

        // Set the session's token so that client activities can communicate with it.
        setSessionToken(mediaSession.getSessionToken());
    }

    @Nullable
    @Override
    public BrowserRoot onGetRoot(@NonNull String clientPackageName, int clientUid, @Nullable Bundle rootHints) {
        // Allow Android Auto and other trusted clients to browse
        return new BrowserRoot(MY_MEDIA_ROOT_ID, null);
    }

    @Override
    public void onLoadChildren(@NonNull String parentId, @NonNull Result<List<MediaBrowserCompat.MediaItem>> result) {
        // Return an empty list for now.
        // Real implementation would populate this with stations/tracks.
        result.sendResult(new ArrayList<>());
    }
}
