import { types as mediasoupTypes } from 'mediasoup';

export class Peer {
  id: string;
  displayName: string;
  roomId: string;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
  rtpCapabilities?: mediasoupTypes.RtpCapabilities;

  constructor(id: string, displayName: string, roomId: string) {
    this.id = id;
    this.displayName = displayName;
    this.roomId = roomId;
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
  }

  addTransport(transport: mediasoupTypes.WebRtcTransport) {
    this.transports.set(transport.id, transport);
  }

  getTransport(transportId: string): mediasoupTypes.WebRtcTransport | undefined {
    return this.transports.get(transportId);
  }

  addProducer(producer: mediasoupTypes.Producer) {
    this.producers.set(producer.id, producer);
  }

  getProducer(producerId: string): mediasoupTypes.Producer | undefined {
    return this.producers.get(producerId);
  }

  removeProducer(producerId: string) {
    this.producers.delete(producerId);
  }

  addConsumer(consumer: mediasoupTypes.Consumer) {
    this.consumers.set(consumer.id, consumer);
  }

  getConsumer(consumerId: string): mediasoupTypes.Consumer | undefined {
    return this.consumers.get(consumerId);
  }

  removeConsumer(consumerId: string) {
    this.consumers.delete(consumerId);
  }

  close() {
    // Close all transports (which will also close producers and consumers)
    this.transports.forEach((transport) => transport.close());
    this.transports.clear();
    this.producers.clear();
    this.consumers.clear();
  }
}
