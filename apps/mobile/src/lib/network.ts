// Connectivity from expo-network (native listener on Android/iOS, navigator.onLine on web).
// The result also drives react-query's onlineManager so queries pause/resume with the network.
import { useEffect } from 'react';
import { useNetworkState } from 'expo-network';
import { onlineManager } from '@tanstack/react-query';

export function useOnline(): boolean {
  const state = useNetworkState();
  // Fields are undefined until the first native event: treat "unknown" as online so the
  // banner never flashes on launch. isInternetReachable=false catches "Wi-Fi but no internet".
  const online = state.isConnected !== false && state.isInternetReachable !== false;
  useEffect(() => {
    onlineManager.setOnline(online);
  }, [online]);
  return online;
}
