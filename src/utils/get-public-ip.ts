import axios from 'axios';

/**
 * AWS ECS 환경에서 Task의 Public IP를 가져옵니다.
 * ECS 메타데이터 API를 사용하여 Public IP를 조회합니다.
 *
 * @returns Public IP 주소 또는 fallback IP
 */
export async function getPublicIP(): Promise<string> {
  try {
    // ECS Fargate에서는 네트워크 메타데이터가 private IP를 반환하므로
    // 외부 IP 조회 서비스를 먼저 사용합니다
    try {
      const externalResponse = await axios.get('https://api.ipify.org?format=text', {
        timeout: 3000,
      });
      const publicIP = externalResponse.data.trim();
      console.log(`✅ External Public IP detected: ${publicIP}`);
      return publicIP;
    } catch (externalError) {
      console.warn('⚠️  External IP service failed, trying EC2 metadata...');
    }

    // Fallback: EC2 메타데이터 API 시도
    try {
      const response = await axios.get(
        'http://169.254.169.254/latest/meta-data/public-ipv4',
        { timeout: 1000 }
      );
      console.log(`✅ EC2 Public IP detected: ${response.data}`);
      return response.data;
    } catch (ec2Error) {
      console.warn('⚠️  EC2 metadata failed');
    }

    // Last resort: ECS Task 메타데이터 (보통 private IP를 반환)
    const metadataUri = process.env.ECS_CONTAINER_METADATA_URI_V4;
    if (metadataUri) {
      const taskMetadataResponse = await axios.get(`${metadataUri}/task`, {
        timeout: 2000,
      });

      const containers = taskMetadataResponse.data.Containers;
      if (containers && containers.length > 0) {
        const networks = containers[0].Networks;
        if (networks && networks.length > 0) {
          const ip = networks[0].IPv4Addresses?.[0];
          if (ip && ip !== '127.0.0.1') {
            console.warn(`⚠️  Using ECS private IP (may not work): ${ip}`);
            return ip;
          }
        }
      }
    }

    console.warn('⚠️  Failed to detect Public IP, using fallback 127.0.0.1');
    return '127.0.0.1';

  } catch (error) {
    console.error('⚠️  Error detecting Public IP:', error.message);
    return '127.0.0.1';
  }
}

/**
 * Public IP를 가져와서 환경 변수에 설정합니다.
 * 서버 시작 전에 호출하세요.
 */
export async function initializePublicIP(): Promise<void> {
  if (!process.env.MEDIASOUP_ANNOUNCED_IP) {
    const publicIP = await getPublicIP();
    process.env.MEDIASOUP_ANNOUNCED_IP = publicIP;
    console.log(`🌐 Mediasoup announcedIp set to: ${publicIP}`);
  } else {
    console.log(`🌐 Mediasoup announcedIp (from env): ${process.env.MEDIASOUP_ANNOUNCED_IP}`);
  }
}
