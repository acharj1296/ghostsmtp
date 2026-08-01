export class MailConfigService {
  /**
   * Returns active mail routing infrastructure presets.
   */
  getMailPresets() {
    return {
      ports: {
        smtp: 25,
        submission: 587,
        imap: 143,
      },
      tls: {
        enabled: true,
        enforceMandatory: false,
        protocols: ['TLSv1.2', 'TLSv1.3'],
      },
      sasl: {
        type: 'dovecot',
        path: 'inet:dovecot:10001',
      },
      rspamd: {
        endpoint: 'http://rspamd:11334',
      },
      dkim: {
        defaultSelector: 'ghost',
      },
    };
  }
}
export default MailConfigService;
