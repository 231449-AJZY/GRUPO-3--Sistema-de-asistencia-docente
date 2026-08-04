const String defaultServerUrl = 'https://192.168.100.16:3443';

const Set<String> _legacyLocalHosts = <String>{
  '192.168.100.16',
  '192.168.1.100',
  '127.0.0.1',
  'localhost',
};

String normalizeServerUrl(String rawValue) {
  String value = rawValue.trim();

  while (value.endsWith('/')) {
    value = value.substring(0, value.length - 1);
  }

  if (value.toLowerCase().endsWith('/api')) {
    value = value.substring(0, value.length - 4);
  }

  if (value.isEmpty) {
    return defaultServerUrl;
  }

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    value = 'https://$value';
  }

  return value;
}

String migrateServerUrl(String rawValue) {
  final String normalized = normalizeServerUrl(rawValue);
  final Uri? uri = Uri.tryParse(normalized);

  if (uri == null) {
    return defaultServerUrl;
  }

  final bool isLegacyLocalHttp =
      uri.scheme.toLowerCase() == 'http' &&
      _legacyLocalHosts.contains(uri.host.toLowerCase()) &&
      (uri.hasPort ? uri.port == 3000 : true);

  if (isLegacyLocalHttp) {
    return defaultServerUrl;
  }

  return normalized;
}
