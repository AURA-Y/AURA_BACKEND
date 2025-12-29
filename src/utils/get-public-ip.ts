import axios from 'axios';

/**
 * AWS ECS 환경에서 Task의 Public IP를 가져옵니다.
 * ECS 메타데이터 API를 사용하여 Public IP를 조회합니다.
 *
 * @returns Public IP 주소 또는 fallback IP
 */
export async function getPublicIP(): Promise<string> {
  try {
    // AWS ECS Task 메타데이터 엔드포인트 (v4)
    const metadataUri = process.env.ECS_CONTAINER_METADATA_URI_V4;

    if (metadataUri) {
      // ECS Fargate 환경
      const taskMetadataResponse = await axios.get(`${metadataUri}/task`, {
        timeout: 2000,
      });

      // Task의 네트워크 인터페이스에서 Public IP 추출
      const containers = taskMetadataResponse.data.Containers;
      if (containers && containers.length > 0) {
        const networks = containers[0].Networks;
        if (networks && networks.length > 0) {
          const publicIP = networks[0].IPv4Addresses?.[0];
          if (publicIP && publicIP !== '127.0.0.1') {
            console.log(`✅ ECS Public IP detected: ${publicIP}`);
            return publicIP;
          }
        }
      }
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
      // EC2 메타데이터 실패 시 무시
    }

    // Fallback: 외부 IP 조회 서비스
    const externalResponse = await axios.get('https://api.ipify.org?format=text', {
      timeout: 2000,
    });
    console.log(`✅ External IP detected: ${externalResponse.data}`);
    return externalResponse.data;

  } catch (error) {
    console.warn('⚠️  Failed to detect Public IP, using 127.0.0.1');
    console.warn('   Error:', error.message);
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
