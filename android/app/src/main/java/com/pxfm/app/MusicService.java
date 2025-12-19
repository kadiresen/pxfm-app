package com.pxfm.app;

import android.os.Bundle;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.MediaDescriptionCompat;
import android.support.v4.media.session.MediaSessionCompat;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.media.MediaBrowserServiceCompat;
import java.util.ArrayList;
import java.util.List;

public class MusicService extends MediaBrowserServiceCompat {
    private MediaSessionCompat mediaSession;
    private static final String MY_MEDIA_ROOT_ID = "media_root_id";
    private static final String FOLDER_ID_ALL_STATIONS = "folder_all_stations";
    private static final String FOLDER_ID_FAVORITES = "folder_favorites";

    // Constants for Android Auto Grid Layout
    private static final String CONTENT_STYLE_BROWSABLE_HINT = "android.media.browse.CONTENT_STYLE_BROWSABLE_HINT";
    private static final String CONTENT_STYLE_PLAYABLE_HINT = "android.media.browse.CONTENT_STYLE_PLAYABLE_HINT";
    private static final int CONTENT_STYLE_GRID_ITEM_HINT_VALUE = 2;
    private static final int CONTENT_STYLE_LIST_ITEM_HINT_VALUE = 1;

    @Override
    public void onCreate() {
        super.onCreate();

        // Create a MediaSessionCompat
        mediaSession = new MediaSessionCompat(this, "MusicService");

        // IMPORTANT: Must be active for Android Auto to interact with it properly
        mediaSession.setActive(true);

        // Set the session's token so that client activities can communicate with it.
        setSessionToken(mediaSession.getSessionToken());
    }

    @Nullable
    @Override
    public BrowserRoot onGetRoot(@NonNull String clientPackageName, int clientUid, @Nullable Bundle rootHints) {
        // Root hints can influence the top-level display, but usually we want tabs for root children.
        // We set LIST hint for the root itself, so the top level folders are listed (or tabbed).
        Bundle extras = new Bundle();
        extras.putInt(CONTENT_STYLE_BROWSABLE_HINT, CONTENT_STYLE_LIST_ITEM_HINT_VALUE);
        extras.putInt(CONTENT_STYLE_PLAYABLE_HINT, CONTENT_STYLE_LIST_ITEM_HINT_VALUE);

        return new BrowserRoot(MY_MEDIA_ROOT_ID, extras);
    }

    @Override
    public void onLoadChildren(@NonNull String parentId, @NonNull Result<List<MediaBrowserCompat.MediaItem>> result) {
        List<MediaBrowserCompat.MediaItem> mediaItems = new ArrayList<>();

        if (MY_MEDIA_ROOT_ID.equals(parentId)) {
            // Root level: Return folders (Tabs in Android Auto)
            mediaItems.add(createBrowsableFolder(FOLDER_ID_FAVORITES, "Favorites", "Your favorite stations"));
            mediaItems.add(createBrowsableFolder(FOLDER_ID_ALL_STATIONS, "All Stations", "Listen to all stations"));

        } else if (FOLDER_ID_ALL_STATIONS.equals(parentId)) {
            // All Stations folder: Return stations (Playable items)
            // Here we want GRID layout. The hint must be on the FOLDER item that opened this,
            // OR we can try to hint the items themselves (less common).
            // Actually, Android Auto checks the hint of the NODE being browsed.
            // Since we can't change the hint of the 'parentId' node dynamically here,
            // the hint should have been set when creating the FOLDER_ID_ALL_STATIONS item.
            // (See createBrowsableFolder method below)

            // Add sample stations
            mediaItems.add(createPlayableStation("1", "Kral FM", "Arabesk", "https://example.com/kral.jpg"));
            mediaItems.add(createPlayableStation("2", "Power Turk", "Pop", "https://example.com/power.jpg"));
            mediaItems.add(createPlayableStation("3", "Joy FM", "Slow", "https://example.com/joy.jpg"));
            mediaItems.add(createPlayableStation("4", "Metro FM", "Hit", "https://example.com/metro.jpg"));
            mediaItems.add(createPlayableStation("5", "Fenomen", "Pop", "https://example.com/fenomen.jpg"));
             mediaItems.add(createPlayableStation("6", "Number 1", "Hit", "https://example.com/nr1.jpg"));

        } else if (FOLDER_ID_FAVORITES.equals(parentId)) {
            // Favorites folder: Empty for now or sample
            mediaItems.add(createPlayableStation("1", "Kral FM", "Arabesk", "https://example.com/kral.jpg"));
        }

        result.sendResult(mediaItems);
    }

    private MediaBrowserCompat.MediaItem createBrowsableFolder(String id, String title, String subtitle) {
        Bundle extras = new Bundle();
        // This folder's children should be displayed as a GRID
        extras.putInt(CONTENT_STYLE_BROWSABLE_HINT, CONTENT_STYLE_GRID_ITEM_HINT_VALUE);
        extras.putInt(CONTENT_STYLE_PLAYABLE_HINT, CONTENT_STYLE_GRID_ITEM_HINT_VALUE);

        MediaDescriptionCompat.Builder descriptionBuilder = new MediaDescriptionCompat.Builder()
                .setMediaId(id)
                .setTitle(title)
                .setSubtitle(subtitle)
                .setExtras(extras);

        return new MediaBrowserCompat.MediaItem(descriptionBuilder.build(), MediaBrowserCompat.MediaItem.FLAG_BROWSABLE);
    }

    private MediaBrowserCompat.MediaItem createPlayableStation(String id, String title, String subtitle, String iconUrl) {
        MediaDescriptionCompat.Builder descriptionBuilder = new MediaDescriptionCompat.Builder()
                .setMediaId(id)
                .setTitle(title)
                .setSubtitle(subtitle);
                // .setIconUri(Uri.parse(iconUrl));

        return new MediaBrowserCompat.MediaItem(descriptionBuilder.build(), MediaBrowserCompat.MediaItem.FLAG_PLAYABLE);
    }
}
