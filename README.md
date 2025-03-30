
<div align="center">
<a href="https://github.com/1RandomDev/iptables-web-ui">
    <img src="https://raw.githubusercontent.com/1RandomDev/iptables-web-ui/master/www/img/icon.png" width="128" />
</a>
</div>
<br>

# iptables-web-ui

A web-based manager for Iptables rules that uses the same syntax as the `iptables` CLI, featuring a well-organized table layout and allowing users to easily insert, delete, edit, and rearrange rules via drag-and-drop.

![Screenshot](https://raw.githubusercontent.com/1RandomDev/iptables-web-ui/master/assets/screenshot1.png)

## Installation

**Docker CLI:**
```bash
docker run -d --name=iptables-web-ui \
    --network=host \
    -v data:/app/data \
    -v /etc/iptables:/etc/iptables \
    -e TZ=<timezone> \
    -e WEBUI_PASSWORD=<my_secret_password> \
    ghcr.io/1randomdev/iptables-web-ui:latest
```

**Docker Compose:**
```yaml
services:
  iptables-web-ui:
    container_name: iptables-web-ui
    image: ghcr.io/1randomdev/iptables-web-ui:latest
    network_mode: host
    cap_add:
      - NET_ADMIN
    volumes:
      - iptables-web-ui_data:/app/data
      - /etc/iptables:/etc/iptables # Optional, necessary for saving lists for iptables-persistent
    environment:
      - TZ=<timezone>
      - WEBUI_PASSWORD=<my_secret_password>
    restart: unless-stopped
```
For all available options see [docker-compose.yml](https://github.com/1RandomDev/iptables-web-ui/blob/master/docker-compose.yml)

## Configuration
| Variable | Description | Default |
| -------- | ----------- | ------- |
| DEFAULT_CHAIN | Chain that is selected when you open the interface. Format: `<ipv6 true/false>-<table>-<chain>` | `false-filter-INPUT` |
| FLUSH_ON_RESTORE | Clear all rules and chains on restore. This is the default behavior of iptables-restore, usually this should not be changed. Can be used to only save and restore selected tables to prevent messing up automatically generated chains like the ones from docker or libvirt (required additional steps when first loading the rules). | `true` |
| WEBUI_HOST | Ip address the web interface listens on. | *all* |
| WEBUI_PORT | Port the web interface listens on. | `8585` |
| WEBUI_PASSWORD | Super secret web interface password. | *none* |
| DATA_DIRECTORY | Path for saving keys and user configurations. | `/app/data` |
| DEBUG_MODE | Print executed iptables commands for debug purposes. | `false` |
