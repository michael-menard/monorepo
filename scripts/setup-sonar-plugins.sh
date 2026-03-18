#!/bin/bash
# Download SonarQube Community Branch Plugin
# Run this once before starting SonarQube

PLUGIN_VERSION="1.20.0"
PLUGIN_DIR="sonarqube-plugins"
PLUGIN_URL="https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/download/${PLUGIN_VERSION}/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar"

mkdir -p "$PLUGIN_DIR"

if [ -f "$PLUGIN_DIR/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar" ]; then
    echo "Plugin already downloaded"
else
    echo "Downloading Community Branch Plugin v${PLUGIN_VERSION}..."
    curl -fsSL -o "$PLUGIN_DIR/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar" "$PLUGIN_URL"
    echo "Downloaded successfully"
fi
