import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for acquiring, managing, and cleanly releasing
 * local camera and microphone MediaStream for WebRTC video calls.
 *
 * Implements Step 4 of the WebRTC video-call system:
 * - Requests { video: true, audio: true } via navigator.mediaDevices.getUserMedia
 * - Safely stores active MediaStream in state and ref
 * - Mutes/unmutes audio tracks and enables/disables video tracks
 * - Stops every MediaStreamTrack on unmount or when call ends
 * - Categorizes and handles device and permission errors
 */
export function useLocalMedia() {
  const [mediaStream, setMediaStream] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'PERMISSION_DENIED' | 'NOT_FOUND' | 'IN_USE' | 'UNSUPPORTED' | 'FAILED' | null
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Store stream in ref for reliable cleanup during unmount
  const streamRef = useRef(null);

  /**
   * Stops all active tracks on the local MediaStream and releases hardware.
   */
  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn('[useLocalMedia] Failed to stop track:', err);
        }
      });
      streamRef.current = null;
    }
    setMediaStream(null);
  }, []);

  /**
   * Maps DOMExceptions from getUserMedia to descriptive user-facing errors
   */
  const mapMediaError = (err) => {
    console.error('[useLocalMedia] getUserMedia error:', err);

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return {
        type: 'PERMISSION_DENIED',
        message: 'Camera and microphone access was denied. Please allow permissions in your browser address bar to participate in the video call.',
      };
    }

    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return {
        type: 'NOT_FOUND',
        message: 'No camera or microphone found. Please connect your audio/video devices and try again.',
      };
    }

    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return {
        type: 'IN_USE',
        message: 'Your camera or microphone is already in use by another application. Please close other video apps and retry.',
      };
    }

    if (err.name === 'OverconstrainedError') {
      return {
        type: 'FAILED',
        message: 'Your media devices do not satisfy standard video/audio constraints.',
      };
    }

    return {
      type: 'FAILED',
      message: err.message || 'Unable to access camera or microphone due to a device failure.',
    };
  };

  /**
   * Requests camera and microphone permissions and initializes the MediaStream.
   */
  const startMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setErrorType(null);

    // Stop existing tracks before requesting new stream
    stopMedia();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const unsupportedMsg = 'Your browser does not support media device capture (WebRTC getUserMedia).';
      setError(unsupportedMsg);
      setErrorType('UNSUPPORTED');
      setIsLoading(false);
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setMediaStream(stream);

      // Initialize track states
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      if (audioTracks.length > 0) {
        setIsMuted(!audioTracks[0].enabled);
      }
      if (videoTracks.length > 0) {
        setIsCameraOff(!videoTracks[0].enabled);
      }

      setIsLoading(false);
      return stream;
    } catch (err) {
      // Fallback: If both video+audio failed with NotFoundError, attempt audio-only if camera is missing
      if (err.name === 'NotFoundError') {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });

          streamRef.current = audioOnlyStream;
          setMediaStream(audioOnlyStream);
          setIsCameraOff(true);
          setError('Camera not detected. Connected with microphone audio only.');
          setErrorType('NOT_FOUND');
          setIsLoading(false);
          return audioOnlyStream;
        } catch (audioErr) {
          const mapped = mapMediaError(audioErr);
          setError(mapped.message);
          setErrorType(mapped.type);
          setIsLoading(false);
          return null;
        }
      }

      const mapped = mapMediaError(err);
      setError(mapped.message);
      setErrorType(mapped.type);
      setIsLoading(false);
      return null;
    }
  }, [stopMedia]);

  /**
   * Toggles microphone mute state across all active audio tracks
   */
  const toggleMute = useCallback((forcedState = null) => {
    if (!streamRef.current) {
      setIsMuted((prev) => !prev);
      return;
    }

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      setIsMuted((prev) => !prev);
      return;
    }

    const targetMuted = typeof forcedState === 'boolean'
      ? forcedState
      : audioTracks[0].enabled; // If enabled, we want to mute

    audioTracks.forEach((track) => {
      track.enabled = !targetMuted;
    });

    setIsMuted(targetMuted);
  }, []);

  /**
   * Toggles camera on/off state across all active video tracks
   */
  const toggleCamera = useCallback((forcedState = null) => {
    if (!streamRef.current) {
      setIsCameraOff((prev) => !prev);
      return;
    }

    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length === 0) {
      setIsCameraOff((prev) => !prev);
      return;
    }

    const targetCameraOff = typeof forcedState === 'boolean'
      ? forcedState
      : videoTracks[0].enabled; // If enabled, we want to turn off

    videoTracks.forEach((track) => {
      track.enabled = !targetCameraOff;
    });

    setIsCameraOff(targetCameraOff);
  }, []);

  // Request camera and microphone access on mount
  useEffect(() => {
    startMedia();

    // Comprehensive cleanup: stop every track when unmounting or leaving call
    return () => {
      stopMedia();
    };
  }, [startMedia, stopMedia]);

  return {
    mediaStream,
    isLoading,
    error,
    errorType,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    startMedia,
    stopMedia,
  };
}

export default useLocalMedia;
