# VOLEXMC PaperMC 1.21.6 Delivery Bridge Plugin

Companion Paper plugin connecting your Minecraft server (`play.volex.indevs.in`) with the VOLEXMC Web Store automated fulfillment queue.

## Setup Instructions

1. Build the plugin JAR (requires JDK 21 & Maven):
   ```bash
   cd paper-plugin
   mvn clean package
   ```
2. Copy `target/volexmc-delivery-1.0.0.jar` into your PaperMC `1.21.6` server's `plugins/` folder and start the server once to generate `plugins/VolexDelivery/config.yml`.
3. Open your VOLEXMC Admin Panel → **Security & Bridge** → **Generate / Rotate Plugin Key** and copy the key.
4. Edit `plugins/VolexDelivery/config.yml`:
   ```yaml
   api-url: "https://your-volexmc-store-url"
   plugin-api-key: "vlx_live_..."
   poll-interval-seconds: 15
   require-player-online: false
   ```
5. Restart your Paper server or run `/volexclaim` to verify connectivity (`Plugin Bridge: Connected` appears in Admin → Overview / Integration).
