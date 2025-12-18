package com.pxfm.app.wear;

import android.app.Activity;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import com.pxfm.app.wear.databinding.ActivityMainBinding;

import java.io.IOException;

public class MainActivity extends Activity {

    private ActivityMainBinding binding;
    private MediaPlayer mediaPlayer;
    private boolean isPlaying = false;

    // TODO: Replace with your actual stream URL or fetch dynamically
    private static final String STREAM_URL = "https://stream.zeno.fm/g4n2811262zuv";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.text.setText("Ready to Play");

        binding.btnPlay.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                togglePlay();
            }
        });
    }

    private void togglePlay() {
        if (isPlaying) {
            stopRadio();
        } else {
            playRadio();
        }
    }

    private void playRadio() {
        if (mediaPlayer == null) {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            );
            try {
                mediaPlayer.setDataSource(STREAM_URL);
                mediaPlayer.prepareAsync();
                binding.text.setText("Buffering...");

                mediaPlayer.setOnPreparedListener(new MediaPlayer.OnPreparedListener() {
                    @Override
                    public void onPrepared(MediaPlayer mp) {
                        mp.start();
                        isPlaying = true;
                        binding.text.setText("Playing");
                        binding.btnPlay.setText("Stop");
                    }
                });

                mediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                    @Override
                    public boolean onError(MediaPlayer mp, int what, int extra) {
                        binding.text.setText("Error playing");
                        return false;
                    }
                });

            } catch (IOException e) {
                e.printStackTrace();
                binding.text.setText("Error loading");
            }
        } else {
            mediaPlayer.start();
            isPlaying = true;
            binding.text.setText("Playing");
            binding.btnPlay.setText("Stop");
        }
    }

    private void stopRadio() {
        if (mediaPlayer != null && mediaPlayer.isPlaying()) {
            mediaPlayer.pause();
        }
        isPlaying = false;
        binding.text.setText("Paused");
        binding.btnPlay.setText("Play");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }
}
