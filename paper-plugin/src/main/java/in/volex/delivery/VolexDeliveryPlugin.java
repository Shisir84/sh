package in.volex.delivery;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Statistic;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class VolexDeliveryPlugin extends JavaPlugin {
  private final Gson gson = new Gson();
  private HttpClient httpClient;
  private String apiUrl;
  private String pluginKey;
  private boolean requirePlayerOnline;

  @Override
  public void onEnable() {
    saveDefaultConfig();
    reloadBridgeConfig();
    httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .build();

    long intervalTicks = Math.max(5L, getConfig().getLong("poll-interval-seconds", 15L)) * 20L;
    Bukkit.getScheduler().runTaskTimerAsynchronously(this, this::syncCycle, 100L, intervalTicks);
    getLogger().info("VolexDelivery 1.0.0 active for Paper 1.21.6");
  }

  private void reloadBridgeConfig() {
    reloadConfig();
    String rawUrl = getConfig().getString("api-url", "");
    apiUrl = rawUrl.endsWith("/") ? rawUrl.substring(0, rawUrl.length() - 1) : rawUrl;
    pluginKey = getConfig().getString("plugin-api-key", "");
    requirePlayerOnline = getConfig().getBoolean("require-player-online", false);
  }

  private void syncCycle() {
    if (apiUrl.isEmpty() || pluginKey.isEmpty() || pluginKey.contains("REPLACE_WITH")) {
      return;
    }
    sendHeartbeat();
    pollAndDispatchDeliveries();
  }

  private void sendHeartbeat() {
    try {
      List<Map<String, Object>> playerSnapshots = new ArrayList<>();
      for (Player p : Bukkit.getOnlinePlayers()) {
        Map<String, Object> snap = new HashMap<>();
        snap.put("username", p.getName());
        snap.put("playtimeHours", Math.round((p.getStatistic(Statistic.PLAY_ONE_MINUTE) / 72000.0) * 10.0) / 10.0);
        snap.put("kills", p.getStatistic(Statistic.MOB_KILLS));
        playerSnapshots.add(snap);
      }

      Map<String, Object> body = new HashMap<>();
      body.put("pluginVersion", getDescription().getVersion());
      body.put("onlinePlayers", Bukkit.getOnlinePlayers().size());
      body.put("tps", Math.round(Bukkit.getTPS()[0] * 100.0) / 100.0);
      body.put("players", playerSnapshots);

      HttpRequest req = HttpRequest.newBuilder()
          .uri(URI.create(apiUrl + "/api/plugin/heartbeat"))
          .timeout(Duration.ofSeconds(8))
          .header("Content-Type", "application/json")
          .header("X-Volex-Plugin-Key", pluginKey)
          .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
          .build();
      httpClient.send(req, HttpResponse.BodyHandlers.discarding());
    } catch (Exception ex) {
      getLogger().warning("Heartbeat failed: " + ex.getMessage());
    }
  }

  private void pollAndDispatchDeliveries() {
    try {
      HttpRequest req = HttpRequest.newBuilder()
          .uri(URI.create(apiUrl + "/api/plugin/poll-deliveries?limit=10"))
          .timeout(Duration.ofSeconds(8))
          .header("X-Volex-Plugin-Key", pluginKey)
          .GET()
          .build();
      HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() != 200) return;

      JsonObject json = gson.fromJson(res.body(), JsonObject.class);
      JsonArray deliveries = json.getAsJsonArray("deliveries");
      if (deliveries == null) return;

      for (JsonElement elem : deliveries) {
        JsonObject job = elem.getAsJsonObject();
        String jobId = job.get("jobId").getAsString();
        String username = job.get("minecraftUsername").getAsString();
        String productName = job.get("productName").getAsString();
        JsonArray commands = job.getAsJsonArray("commands");

        Bukkit.getScheduler().runTask(this, () -> {
          Player target = Bukkit.getPlayerExact(username);
          if (requirePlayerOnline && (target == null || !target.isOnline())) {
            ackAsync(jobId, false, "Player offline while require-player-online=true");
            return;
          }

          boolean ok = true;
          for (JsonElement cmdEl : commands) {
            String cmd = cmdEl.getAsString();
            if (!Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd)) {
              ok = false;
            }
          }
          if (target != null && target.isOnline() && ok) {
            target.sendMessage(ChatColor.LIGHT_PURPLE + "[VOLEXMC] " + ChatColor.WHITE + "Delivered: " + ChatColor.GOLD + productName);
          }
          ackAsync(jobId, ok, ok ? "Dispatched cleanly on Paper 1.21.6" : "One or more console commands returned false");
        });
      }
    } catch (Exception ex) {
      getLogger().warning("Delivery poll failed: " + ex.getMessage());
    }
  }

  private void ackAsync(String jobId, boolean success, String message) {
    Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
      try {
        Map<String, Object> body = new HashMap<>();
        body.put("jobId", jobId);
        body.put("success", success);
        body.put("message", message);
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl + "/api/plugin/ack-delivery"))
            .timeout(Duration.ofSeconds(8))
            .header("Content-Type", "application/json")
            .header("X-Volex-Plugin-Key", pluginKey)
            .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
            .build();
        httpClient.send(req, HttpResponse.BodyHandlers.discarding());
      } catch (Exception ex) {
        getLogger().warning("Delivery ack failed: " + ex.getMessage());
      }
    });
  }

  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    if (command.getName().equalsIgnoreCase("volexclaim")) {
      sender.sendMessage(ChatColor.LIGHT_PURPLE + "[VOLEXMC] " + ChatColor.GRAY + "Checking pending store deliveries...");
      Bukkit.getScheduler().runTaskAsynchronously(this, this::pollAndDispatchDeliveries);
      return true;
    }
    if (command.getName().equalsIgnoreCase("volexstatus")) {
      sender.sendMessage(ChatColor.LIGHT_PURPLE + "[VOLEXMC] " + ChatColor.WHITE + "Store URL: " + apiUrl);
      return true;
    }
    return false;
  }
}
