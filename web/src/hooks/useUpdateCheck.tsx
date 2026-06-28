import { useEffect } from 'react';
import { notification, Button } from 'antd';
import { API_BASE, SERVER_URL } from '../config/env';

const LOCAL_BUILD_KEY = 'tm_app_build';

/** APP/Web 启动时检查服务端是否有新版本 APK */
export function useUpdateCheck() {
  useEffect(() => {
    const localBuild = localStorage.getItem(LOCAL_BUILD_KEY) || '';
    const checkUrl = SERVER_URL
      ? `${SERVER_URL}/api/update/check?build=${encodeURIComponent(localBuild)}`
      : `/api/update/check?build=${encodeURIComponent(localBuild)}`;
    fetch(checkUrl)
      .then(r => r.json())
      .then(data => {
        if (data.hasUpdate && data.available) {
          notification.info({
            message: '发现新版本',
            description: `童梦AI v${data.version} (${data.build}) 已发布`,
            duration: 0,
            btn: (
              <Button type="primary" size="small" onClick={() => window.open('/download', '_blank')}>
                立即更新
              </Button>
            ),
          });
        }
        if (data.build) localStorage.setItem(LOCAL_BUILD_KEY, data.build);
      })
      .catch(() => {});
  }, []);
}
