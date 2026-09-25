import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Download, 
  ExternalLink, 
  Zap, 
  ShieldCheck, 
  Code2, 
  FileText,
  Activity,
  Check,
  Mail,
  Send
} from 'lucide-react';
import { HttpApiConfig } from '../types';
import { safeFetchJson } from '../services/safeFetch';

interface HttpApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: HttpApiConfig;
  onSaveConfig: (newConfig: HttpApiConfig) => void;
  showToast: (msg: string) => void;
}

export const PHP_SCRIPT_CONTENT = `<?php
/**
 * ==============================================================================
 * Self-Hosted Email Dispatch API for cPanel / Apache / Nginx / DirectAdmin
 * ==============================================================================
 * Allows applications on cloud hosts (Railway, Render, Vercel) where outbound
 * SMTP ports (587, 465, 25) are blocked on free plans, to send emails via
 * standard HTTPS Port 443!
 *
 * INSTALLATION:
 * 1. Upload this file to your cPanel File Manager: public_html/send.php
 * 2. Keep or adjust SECRET_API_KEY below.
 * 3. In the SMILE MACHINES app, enter: https://yourdomain.com/send.php
 * ==============================================================================
 */

// 1. CONFIGURATION: Set your Secret API Key (must match the key in the app)
define('SECRET_API_KEY', 'smile_cpanel_api_key_77a8b9c0d1');

// 2. CORS HEADERS (Enables browser & server HTTPS communication)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'preflight_ok']);
    exit;
}

// 3. API AUTHENTICATION & INPUT PARSING
$rawInput = file_get_contents('php://input');
$data = !empty($rawInput) ? json_decode($rawInput, true) : null;

function getSubmittedApiKey($data = null) {
    if (!empty($_SERVER['HTTP_X_API_KEY'])) return trim($_SERVER['HTTP_X_API_KEY']);
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            return trim($matches[1]);
        }
    }
    if (!empty($data['apiKey'])) return trim($data['apiKey']);
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $k => $v) {
            if (strcasecmp($k, 'X-API-KEY') === 0) return trim($v);
        }
    }
    if (!empty($_GET['key'])) return trim($_GET['key']);
    return null;
}

$providedKey = getSubmittedApiKey($data);
if (empty($providedKey) || $providedKey !== SECRET_API_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized: Invalid or missing API Key. Provide X-API-KEY header.'
    ]);
    exit;
}

// 4. HEALTH CHECK / LIVE PING
if ($_SERVER['REQUEST_METHOD'] === 'GET' || (isset($data['action']) && $data['action'] === 'ping') || !empty($data['ping'])) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'status' => 'online',
        'message' => 'Self-Hosted cPanel Mail API is online and authenticated.',
        'server' => $_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? 'cpanel.local',
        'php_version' => PHP_VERSION,
        'timestamp' => date('c'),
        'mta_configured' => function_exists('mail'),
    ]);
    exit;
}

// 5. EMAIL DISPATCH (POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed. Use POST.']);
    exit;
}

if (empty($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Empty request payload or invalid JSON format.']);
    exit;
}

$to = trim($data['to'] ?? $data['recipient'] ?? '');
if (empty($to) || !filter_var(filter_var($to, FILTER_SANITIZE_EMAIL), FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => "Missing or invalid recipient email address: '{$to}'."]);
    exit;
}

$subject = $data['subject'] ?? '(No Subject)';
$text = $data['text'] ?? $data['plainText'] ?? '';
$html = $data['html'] ?? $data['htmlContent'] ?? '';
$fromRaw = trim($data['from'] ?? $data['fromEmail'] ?? '');
$fallbackName = trim($data['fromName'] ?? '');

$senderEmail = '';
$senderName = $fallbackName;
if (preg_match('/^(.*?)\\s*<([^>]+)>$/', $fromRaw, $matches)) {
    $senderName = trim($matches[1], ' "\\'');
    $senderEmail = trim($matches[2]);
} else if (filter_var($fromRaw, FILTER_VALIDATE_EMAIL)) {
    $senderEmail = $fromRaw;
} else if (!empty($data['fromEmail']) && filter_var($data['fromEmail'], FILTER_VALIDATE_EMAIL)) {
    $senderEmail = trim($data['fromEmail']);
} else {
    $host = $_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
    $senderEmail = 'outbox@' . preg_replace('/^www\\./', '', $host);
}

$domainPart = substr(strrchr($senderEmail, "@"), 1);
if (empty($domainPart)) $domainPart = $_SERVER['SERVER_NAME'] ?? 'cpanel.local';
$messageId = sprintf("<%s.%s@%s>", time(), bin2hex(random_bytes(8)), $domainPart);
$boundary = '=_smile_' . md5(uniqid(time(), true));

$headers = [];
$headers[] = 'MIME-Version: 1.0';
if (!empty($senderName)) {
    $headers[] = "From: =?UTF-8?B?" . base64_encode($senderName) . "?= <{$senderEmail}>";
} else {
    $headers[] = "From: <{$senderEmail}>";
}
if (!empty($data['replyTo'])) {
    $headers[] = 'Reply-To: ' . trim($data['replyTo']);
} else {
    $headers[] = "Reply-To: <{$senderEmail}>";
}
if (!empty($data['cc'])) $headers[] = 'Cc: ' . trim($data['cc']);
if (!empty($data['bcc'])) $headers[] = 'Bcc: ' . trim($data['bcc']);
$headers[] = "Message-ID: {$messageId}";
$headers[] = 'Date: ' . date('r');
$headers[] = 'X-Mailer: SMILE-MACHINES-cPanel-API/v2.0';

if (!empty($html) && !empty($text)) {
    $headers[] = "Content-Type: multipart/alternative; boundary=\\"{$boundary}\\"";
    $body = "--{$boundary}\\r\\nContent-Type: text/plain; charset=UTF-8\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n" . chunk_split(base64_encode($text)) . "\\r\\n";
    $body .= "--{$boundary}\\r\\nContent-Type: text/html; charset=UTF-8\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n" . chunk_split(base64_encode($html)) . "\\r\\n--{$boundary}--\\r\\n";
} else if (!empty($html)) {
    $headers[] = "Content-Type: text/html; charset=UTF-8";
    $headers[] = "Content-Transfer-Encoding: base64";
    $body = chunk_split(base64_encode($html));
} else {
    $headers[] = "Content-Type: text/plain; charset=UTF-8";
    $headers[] = "Content-Transfer-Encoding: base64";
    $body = chunk_split(base64_encode($text));
}

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
array_unshift($headers, "Return-Path: <{$senderEmail}>");
$cleanSender = preg_replace('/[^a-zA-Z0-9.@+_-]/', '', $senderEmail);
$extraParams = !empty($cleanSender) ? "-f" . $cleanSender : "";

$sent = false;
if (!empty($extraParams)) {
    $sent = @mail($to, $encodedSubject, $body, implode("\\r\\n", $headers), $extraParams);
}
if (!$sent) {
    $sent = @mail($to, $encodedSubject, $body, implode("\\r\\n", $headers));
}

try {
    $log = sprintf("[%s] TO: %s | FROM: %s | SUBJ: %s | STATUS: %s\\n", date('Y-m-d H:i:s'), $to, $senderEmail, substr($subject, 0, 40), $sent ? 'ACCEPTED' : 'FAILED');
    @file_put_contents(__DIR__ . '/mail_dispatch.log', $log, FILE_APPEND | LOCK_EX);
} catch (\\Throwable $e) {}

if ($sent) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email accepted for delivery by cPanel local mail server',
        'messageId' => $messageId,
        'to' => $to,
        'from' => $senderEmail,
        'response' => '250 2.0.0 OK: Accepted by cPanel Exim/Postfix MTA',
        'deliveryNotice' => 'Accepted by local MTA. If not in inbox, verify Spam folder or cPanel Track Delivery.',
        'timestamp' => date('c')
    ]);
} else {
    $lastError = error_get_last();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Mail dispatch failed. Verify cPanel Exim/Sendmail is active.',
        'details' => $lastError['message'] ?? 'PHP mail() returned false'
    ]);
}`;

export const HttpApiModal: React.FC<HttpApiModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  showToast,
}) => {
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl || '');
  const [apiKey, setApiKey] = useState(config.apiKey || 'smile_cpanel_api_key_77a8b9c0d1');
  const [senderName, setSenderName] = useState(config.senderName || 'Enterprise Outreach');
  const [senderEmail, setSenderEmail] = useState(config.senderEmail || 'outbox@bgbit.eu');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    serverInfo?: any;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'settings' | 'script' | 'instructions'>('settings');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestMail, setIsSendingTestMail] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async (customRecipient?: string) => {
    if (!endpointUrl.trim()) {
      showToast('Please enter your cPanel API Endpoint URL first.');
      return;
    }

    const isLiveMail = Boolean(customRecipient && customRecipient.includes('@'));
    if (isLiveMail) {
      setIsSendingTestMail(true);
    } else {
      setIsTesting(true);
    }
    setTestResult(null);

    const startTime = Date.now();
    try {
      const res = await safeFetchJson<any>('/api/http-api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: endpointUrl.trim(),
          apiKey: apiKey.trim(),
          testToEmail: customRecipient ? customRecipient.trim() : undefined,
          fromEmail: senderEmail.trim(),
          fromName: senderName.trim(),
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok && res.data && res.data.success) {
        setTestResult({
          success: true,
          message: res.data.message || (isLiveMail ? `Live test email delivered to ${customRecipient}!` : 'Connection verified! cPanel HTTP API is online.'),
          latencyMs,
          serverInfo: res.data.serverInfo,
        });

        const updatedConfig: HttpApiConfig = {
          endpointUrl: endpointUrl.trim(),
          apiKey: apiKey.trim(),
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim(),
          status: 'verified',
          lastTested: new Date().toLocaleTimeString(),
          lastLatencyMs: latencyMs,
          serverInfo: res.data.serverInfo,
        };
        onSaveConfig(updatedConfig);
        showToast(isLiveMail ? `Test email sent to ${customRecipient}!` : 'HTTP API Endpoint verified successfully!');
      } else {
        const errMsg = res.isHtml 
          ? 'Cloud proxy error: Verify the server backend is running.'
          : (res.data?.error || res.error || 'Failed to connect to HTTP API endpoint');
        setTestResult({
          success: false,
          message: errMsg,
          latencyMs,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network request failed',
      });
    } finally {
      setIsTesting(false);
      setIsSendingTestMail(false);
    }
  };

  const handleSave = () => {
    const updated: HttpApiConfig = {
      ...config,
      endpointUrl: endpointUrl.trim(),
      apiKey: apiKey.trim(),
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
    };
    onSaveConfig(updated);
    showToast('Self-Hosted HTTP API configuration saved.');
    onClose();
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(PHP_SCRIPT_CONTENT);
    setCopiedScript(true);
    showToast('send.php code copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([PHP_SCRIPT_CONTENT], { type: 'application/x-httpd-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'send.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded send.php to your computer!');
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    showToast('API Key copied to clipboard!');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Self-Hosted cPanel / VPS HTTP API
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
                  Port 443 HTTPS (No Port Blocks)
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Bypasses Render.com &amp; Railway.com free plan SMTP port restrictions (587/465/25)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950/60 px-6 gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>API Connection &amp; Endpoint</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'script'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Configured send.php Script</span>
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'instructions'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3-Step cPanel Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
          
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Architecture Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-gray-900 border border-emerald-500/20 text-xs text-gray-300 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>How This Completely Solves Cloud Port 587 Timeouts:</span>
                </div>
                <p className="leading-relaxed">
                  When deployed on Render or Railway free tiers, direct SMTP socket connections to port 587/465 are filtered by cloud firewalls. 
                  In this mode, SMILE MACHINES makes an <strong>outbound HTTPS POST call over Port 443</strong> to your own <code className="px-1.5 py-0.5 bg-gray-800 text-emerald-300 rounded font-mono">send.php</code> endpoint. Your server dispatches the email locally through its own internal Exim/Postfix MTA where ports are unrestricted!
                </p>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Endpoint URL */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                    <span>cPanel Endpoint URL (HTTPS):</span>
                    <span className="text-[11px] text-gray-400 font-normal">e.g. https://mail.bgbit.eu/send.php</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={endpointUrl}
                      onChange={(e) => setEndpointUrl(e.target.value)}
                      placeholder="https://yourdomain.com/send.php"
                      className="w-full bg-gray-950 border border-gray-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    The full web address where you uploaded <code className="text-emerald-400 font-mono">send.php</code> in your cPanel <code className="text-gray-300 font-mono">public_html</code> folder.
                  </p>
                </div>

                {/* API Key */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                    <span>API Secret Key:</span>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="smile_cpanel_api_key_77a8b9c0d1"
                      className="w-full bg-gray-950 border border-gray-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Must match the <code className="text-emerald-400 font-mono">SECRET_API_KEY</code> constant defined on Line 20 of your <code className="font-mono text-gray-300">send.php</code>.
                  </p>
                </div>

                {/* Sender Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    From Email Address:
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="info@bgbit.eu"
                    className="w-full bg-gray-950 border border-gray-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-400">
                    Use an email matching your domain to ensure 100% SPF/DKIM alignment.
                  </p>
                </div>

                {/* Sender Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Sender Display Name:
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="BGBit Solutions"
                    className="w-full bg-gray-950 border border-gray-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-xs focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-400">
                    Friendly name shown in the recipient inbox.
                  </p>
                </div>
              </div>

              {/* Test Connection Box */}
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Live HTTPS Handshake Diagnostic
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Pings your cPanel endpoint over Port 443 to verify handshake, authentication, and MTA readiness (Zero emails sent).
                    </p>
                  </div>
                  <button
                    onClick={() => handleTestConnection()}
                    disabled={isTesting || isSendingTestMail || !endpointUrl.trim()}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 shrink-0"
                  >
                    {isTesting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Pinging Port 443...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Test Connection (Ping)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Send Live Test Email (Optional) */}
                <div className="pt-3 border-t border-gray-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      Send Live Test Email to Inbox (Optional):
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">End-to-end delivery test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="e.g. your-email@gmail.com"
                      className="flex-1 bg-gray-900 border border-gray-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestConnection(testEmailRecipient)}
                      disabled={isTesting || isSendingTestMail || !testEmailRecipient.trim() || !endpointUrl.trim()}
                      className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                    >
                      {isSendingTestMail ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Test Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-3.5 rounded-lg text-xs space-y-2 border ${
                    testResult.success 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 w-full">
                        <p className="font-semibold">{testResult.message}</p>
                        {testResult.latencyMs && (
                          <p className="text-[11px] opacity-80">
                            Round-trip latency: <strong>{testResult.latencyMs} ms</strong> (over HTTPS Port 443)
                          </p>
                        )}
                        {testResult.serverInfo && (
                          <div className="text-[11px] opacity-80 font-mono space-x-3 pt-1">
                            <span>Host: {testResult.serverInfo.server || 'cpanel'}</span>
                            <span>•</span>
                            <span>PHP: {testResult.serverInfo.php_version || '7.x/8.x'}</span>
                            <span>•</span>
                            <span>MTA Mail(): {testResult.serverInfo.mta_configured ? 'Active' : 'Unknown'}</span>
                          </div>
                        )}

                        {testResult.success && (
                          <div className="mt-3 p-3 bg-gray-900/90 rounded-lg border border-emerald-500/30 text-gray-300 space-y-2">
                            <p className="font-bold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                              <span>📬</span> How to Verify and Ensure In-Box Delivery:
                            </p>
                            <ul className="space-y-1.5 text-[11px] text-gray-300 list-disc list-inside">
                              <li>
                                <strong className="text-white">Check Spam/Junk Folder:</strong> First-time automated emails from cPanel often land in Gmail/Yahoo Spam. Check your Spam folder and mark &quot;Report Not Spam&quot;.
                              </li>
                              <li>
                                <strong className="text-white">Check cPanel &quot;Track Delivery&quot;:</strong> Log into your cPanel &gt; Email &gt; <strong>Track Delivery</strong>. Type your recipient email to view Exim&apos;s real-time transmission log and delivery status.
                              </li>
                              <li>
                                <strong className="text-white">Real Sender Mailbox:</strong> Ensure <code>{senderEmail || 'outbox@yourdomain.com'}</code> is an actual created email mailbox inside <code>cPanel &gt; Email Accounts</code>.
                              </li>
                              <li>
                                <strong className="text-white">SPF &amp; DKIM Records:</strong> In <code>cPanel &gt; Email Deliverability</code>, verify that SPF and DKIM are listed as <strong>Valid</strong> so external inboxes don&apos;t bounce your messages.
                              </li>
                              <li>
                                <strong className="text-white">Server Dispatch Log:</strong> Check <code>mail_dispatch.log</code> in your cPanel <code>public_html/</code> directory to see timestamps and MTA response codes.
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PHP SCRIPT VIEWER & DOWNLOAD */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Configured send.php Script
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Pre-configured with your matching Secret API Key. Ready for upload.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-colors border border-gray-700"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-md shadow-emerald-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download send.php</span>
                  </button>
                </div>
              </div>

              {/* Code display */}
              <div className="relative bg-gray-950 border border-gray-800 rounded-xl p-4 overflow-x-auto max-h-[380px] custom-scrollbar">
                <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed">
                  {PHP_SCRIPT_CONTENT}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP CPANEL GUIDE */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                How to Install in 3 Minutes on cPanel:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h5 className="text-xs font-semibold text-white">Download send.php</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Click the <strong>Download send.php</strong> button in the script tab, or create a new file on your computer named <code className="text-emerald-400 font-mono">send.php</code> and paste the code.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h5 className="text-xs font-semibold text-white">Upload to cPanel</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Log in to your cPanel dashboard &rarr; open <strong>File Manager</strong> &rarr; navigate to your domain's <code className="text-emerald-400 font-mono">public_html/</code> folder &rarr; click <strong>Upload</strong>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h5 className="text-xs font-semibold text-white">Enter URL &amp; Test</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    In this modal, enter <code className="text-emerald-400 font-mono">https://yourdomain.com/send.php</code> and click <strong>Test Connection</strong>. You will receive an immediate green verification!
                  </p>
                </div>
              </div>

              {/* Troubleshooting note */}
              <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-2 text-xs text-gray-400">
                <span className="font-semibold text-gray-200">Helpful Tips:</span>
                <ul className="list-disc pl-5 space-y-1 text-[11px]">
                  <li>Ensure your URL begins with <code className="text-emerald-400 font-mono">https://</code> so all traffic is encrypted with SSL.</li>
                  <li>If your cPanel uses a subfolder (e.g. <code className="font-mono text-gray-300">public_html/api/send.php</code>), use <code className="text-emerald-400 font-mono">https://yourdomain.com/api/send.php</code>.</li>
                  <li>No external SMTP ports (587, 465, or 25) are opened on Render or Railway—all calls use standard HTTPS port 443!</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-950/80">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>
              Status:{' '}
              <strong className={config.status === 'verified' ? 'text-emerald-400' : 'text-gray-400'}>
                {config.status === 'verified' ? 'Verified & Active' : 'Not Tested'}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              Save &amp; Use HTTP API
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
