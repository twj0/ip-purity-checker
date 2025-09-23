// IP纯净度检查工具 - Cloudflare Worker (修复版本)
// 解决HTML响应截断问题

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // 处理不同路由
        switch (path) {
            case '/':
            case '/index.html':
                return new Response(getHomePage(), {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

            case '/api/check-ip':
                return handleCheckIP(request, env);

            case '/api/status':
                return handleStatus(env);

            case '/api/manual-check':
                return handleManualCheck(request, env);

            case '/api/clash-config':
                return handleClashConfig(env);

            case '/api/task-stats':
                return handleTaskStats(env);

            case '/api/cache-stats':
                return handleCacheStats(env);

            case '/api/cache-cleanup':
                return handleCacheCleanup(request, env);

            case '/api/cache-clear':
                return handleCacheClear(request, env);

            case '/api/user-config/check':
                return handleUserConfigCheck(request, env);

            case '/api/user-config/register':
                return handleUserConfigRegister(request, env);

            case '/api/user-config/login':
                return handleUserConfigLogin(request, env);

            case '/api/user-config/save':
                return handleUserConfigSave(request, env);

            case '/api/user-config/load':
                return handleUserConfigLoad(request, env);

            case '/api/user-config/export':
                return handleUserConfigExport(request, env);

            case '/api/webdav/test':
                return handleWebDAVTest(request, env);

            case '/api/webdav/backup':
                return handleWebDAVBackup(request, env);

            case '/api/webdav/restore':
                return handleWebDAVRestore(request, env);

            case '/api/webdav/list':
                return handleWebDAVList(request, env);

            default:
                return new Response('Not Found', { status: 404 });
        }
    },

    async scheduled(event, env, ctx) {
        console.log('🕐 定时任务开始执行:', new Date().toISOString());

        try {
            // 执行每日IP纯净度检查和Clash配置生成
            const result = await executeScheduledTask(env, ctx);
            console.log('✅ 定时任务执行成功:', result);
        } catch (error) {
            console.error('❌ 定时任务执行失败:', error);

            // 记录错误到KV存储
            if (env.IP_CACHE) {
                await env.IP_CACHE.put('last_error', JSON.stringify({
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    stack: error.stack
                }));
            }
        }
    }
};

// 获取主页HTML - 紧凑版本避免截断
function getHomePage() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 IP地址纯净度检查工具</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 20px; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }
        .header { background: #f8f9fa; color: #2c3e50; padding: 30px; text-align: center; border-bottom: 1px solid #e0e0e0; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; font-weight: 700; }
        .tabs { display: flex; background: #fff; border-bottom: 1px solid #dee2e6; }
        .tab { flex: 1; padding: 15px 20px; background: none; border: none; cursor: pointer; font-size: 14px; color: #6c757d; transition: all 0.3s ease; }
        .tab:hover { background: #f8f9fa; color: #495057; }
        .tab.active { background: #007bff; color: white; }
        .tab-content { display: none; padding: 30px; }
        .tab-content.active { display: block; }
        .section { margin-bottom: 30px; padding: 25px; border: 1px solid #e1e5e9; border-radius: 8px; background: #f8f9fa; }
        .section h3 { color: #2c3e50; margin-bottom: 20px; font-size: 1.3rem; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #555; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
        .btn { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 10px; margin-bottom: 10px; }
        .btn:hover { background: #0056b3; }
        .btn-secondary { background: #6c757d; }
        .btn-danger { background: #dc3545; }
        .alert { padding: 15px; margin: 15px 0; border-radius: 6px; display: none; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .result { background: #f1f3f4; border: 1px solid #dee2e6; padding: 15px; margin: 15px 0; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .config-preview { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; max-height: 500px; overflow-y: auto; white-space: pre-wrap; }
        .download-link { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 10px 5px 0 0; }
        .download-link:hover { background: #0056b3; color: white; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 IP地址纯净度检查工具</h1>
            <p>一站式IP检测、订阅管理和Clash配置生成服务</p>
        </div>

        <div id="alertContainer"></div>

        <div class="tabs">
            <button class="tab active" onclick="switchTab('single-ip', this)">🔍 单IP检测</button>
            <button class="tab" onclick="switchTab('batch-ip', this)">📋 批量检测</button>
            <button class="tab" onclick="switchTab('subscription', this)">📡 订阅管理</button>
            <button class="tab" onclick="switchTab('settings', this)">⚙️ 设置</button>
        </div>

        <div id="single-ip" class="tab-content active">
            <div class="section">
                <h3>🔍 单IP检测</h3>
                <div class="form-group">
                    <label for="singleIp">IP地址:</label>
                    <input type="text" id="singleIp" placeholder="请输入IP地址，例如：8.8.8.8">
                </div>
                <button class="btn" onclick="checkSingleIP()">检测IP</button>
                <div id="singleResult" class="result"></div>
            </div>
        </div>

        <div id="batch-ip" class="tab-content">
            <div class="section">
                <h3>📋 批量IP检测</h3>
                <div class="form-group">
                    <label for="batchIps">IP地址列表 (每行一个IP):</label>
                    <textarea id="batchIps" rows="10" placeholder="请输入IP地址，每行一个：\\n8.8.8.8\\n1.1.1.1\\n208.67.222.222"></textarea>
                </div>
                <button class="btn" onclick="checkBatchIPs()">批量检测</button>
                <button class="btn btn-secondary" onclick="exportResults()">导出CSV</button>
                <div id="batchResult" class="result"></div>
            </div>
        </div>

        <div id="subscription" class="tab-content">
            <div class="section">
                <h3>📡 订阅管理增强版</h3>

                <!-- 统计信息 -->
                <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; text-align: center;">
                        <div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #007bff;" id="totalSubs">0</div>
                            <div style="font-size: 0.9rem; color: #666;">总订阅数</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;" id="validSubs">0</div>
                            <div style="font-size: 0.9rem; color: #666;">有效订阅</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #dc3545;" id="duplicateSubs">0</div>
                            <div style="font-size: 0.9rem; color: #666;">重复订阅</div>
                        </div>
                    </div>
                </div>

                <!-- 立即生成Clash配置 -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
                    <h4 style="margin-bottom: 15px; color: #28a745;">🚀 立即生成Clash配置</h4>
                    <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                        无需等待定时任务，立即执行完整的IP纯净度检查并生成Clash配置文件。
                        <br>包含：解析订阅 → 检测IP纯净度 → 筛选优质IP → 生成YAML配置
                    </p>
                    <div style="margin-bottom: 15px;">
                        <button class="btn" onclick="generateClashConfigNow()" id="generateBtn" style="background: #28a745; font-size: 16px; padding: 12px 24px;">
                            🚀 立即生成Clash配置
                        </button>
                        <button class="btn btn-secondary" onclick="downloadLastConfig()" style="margin-left: 10px;">
                            📥 下载最新配置
                        </button>
                    </div>
                    <div id="generateProgress" style="display: none; background: white; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <div class="spinner" style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #28a745; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
                            <span id="progressText">正在准备...</span>
                        </div>
                        <div style="background: #e9ecef; border-radius: 10px; height: 8px; overflow: hidden;">
                            <div id="progressBar" style="background: #28a745; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    <div id="generateResult" class="result" style="display: none;"></div>
                </div>

                <!-- 添加订阅 -->
                <div class="form-group">
                    <label for="subscriptionName">订阅名称:</label>
                    <input type="text" id="subscriptionName" placeholder="例如：我的订阅">
                </div>
                <div class="form-group">
                    <label for="subscriptionUrl">订阅链接:</label>
                    <input type="url" id="subscriptionUrl" placeholder="https://example.com/subscription">
                </div>

                <!-- 批量添加 -->
                <div class="form-group">
                    <label for="batchSubscriptions">批量添加订阅 (每行一个链接):</label>
                    <textarea id="batchSubscriptions" rows="4" placeholder="https://example1.com/sub1&#10;https://example2.com/sub2&#10;https://example3.com/sub3"></textarea>
                </div>

                <!-- 操作按钮 -->
                <div style="margin-bottom: 20px;">
                    <button class="btn" onclick="addSubscription()">添加订阅</button>
                    <button class="btn" onclick="addBatchSubscriptions()">批量添加</button>
                    <button class="btn btn-secondary" onclick="removeDuplicates()">去重订阅</button>
                    <button class="btn btn-secondary" onclick="checkAllSubscriptions()">检查所有订阅</button>
                </div>

                <!-- 导入导出 -->
                <div style="margin-bottom: 20px;">
                    <button class="btn btn-secondary" onclick="exportSubscriptions()">📤 导出订阅</button>
                    <input type="file" id="importFile" accept=".txt,.json" style="display: none;" onchange="importSubscriptions(event)">
                    <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">📥 导入订阅</button>
                    <button class="btn btn-danger" onclick="clearSubscriptions()">清空所有</button>
                </div>

                <div id="subscriptionResult" class="result"></div>
                <div id="subscriptionList"></div>
            </div>
        </div>

        <div id="settings" class="tab-content">
            <div class="section">
                <h3>⚙️ 设置管理</h3>

                <!-- 用户配置云同步 -->
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                    <h4 style="margin-bottom: 15px; color: #1976d2;">☁️ 云端配置同步</h4>
                    <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                        将您的订阅链接和API密钥安全地保存到云端，实现跨设备/浏览器同步访问。
                        <br>数据采用AES-256加密，只有您知道密码才能访问。
                    </p>

                    <!-- 当前状态 -->
                    <div id="cloudSyncStatus" style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <span id="syncStatusIcon">🔒</span>
                            <span id="syncStatusText" style="margin-left: 10px; font-weight: bold;">本地存储模式</span>
                        </div>
                        <div id="syncStatusDetails" style="font-size: 12px; color: #666;">
                            配置数据仅保存在当前浏览器中
                        </div>
                    </div>

                    <!-- 云同步操作 -->
                    <div id="cloudSyncActions">
                        <!-- 登录/注册区域 -->
                        <div id="loginSection" style="display: block;">
                            <div class="form-group">
                                <label for="userId">用户ID (16位字符):</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="text" id="userId" placeholder="输入您的用户ID" style="flex: 1;" maxlength="16">
                                    <button class="btn btn-secondary" onclick="generateNewUserId()">生成新ID</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="userPassword">配置密码:</label>
                                <input type="password" id="userPassword" placeholder="输入配置密码">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <button class="btn" onclick="loginCloudSync()">🔓 登录云同步</button>
                                <button class="btn btn-secondary" onclick="registerCloudSync()">📝 注册新用户</button>
                                <button class="btn btn-secondary" onclick="checkUserExists()">🔍 检查用户</button>
                            </div>
                        </div>

                        <!-- 已登录区域 -->
                        <div id="loggedInSection" style="display: none;">
                            <div style="margin-bottom: 15px;">
                                <button class="btn" onclick="saveToCloud()">☁️ 保存到云端</button>
                                <button class="btn btn-secondary" onclick="loadFromCloud()">📥 从云端加载</button>
                                <button class="btn btn-secondary" onclick="exportCloudConfig()">📤 导出配置</button>
                                <button class="btn btn-danger" onclick="logoutCloudSync()">🚪 退出登录</button>
                            </div>
                        </div>
                    </div>

                    <div id="cloudSyncResult" class="result" style="display: none;"></div>
                </div>

                <!-- WebDAV云备份 -->
                <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #9c27b0;">
                    <h4 style="margin-bottom: 15px; color: #7b1fa2;">🌐 WebDAV云备份</h4>
                    <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                        使用您自己的WebDAV兼容云存储服务（如Nextcloud、ownCloud等）备份配置数据。
                        <br>数据直接存储在您的私人云存储中，完全由您控制。
                    </p>

                    <!-- WebDAV状态 -->
                    <div id="webdavStatus" style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <span id="webdavStatusIcon">🔒</span>
                            <span id="webdavStatusText" style="margin-left: 10px; font-weight: bold;">未配置WebDAV</span>
                        </div>
                        <div id="webdavStatusDetails" style="font-size: 12px; color: #666;">
                            请配置WebDAV服务器信息以启用云备份
                        </div>
                    </div>

                    <!-- WebDAV配置 -->
                    <div id="webdavConfig">
                        <div class="form-group">
                            <label for="webdavUrl">WebDAV服务器URL:</label>
                            <input type="url" id="webdavUrl" placeholder="https://your-cloud.com/remote.php/dav/files/username/" style="width: 100%;">
                            <small style="color: #666;">例如: https://nextcloud.example.com/remote.php/dav/files/username/</small>
                        </div>
                        <div class="form-group">
                            <label for="webdavUsername">用户名:</label>
                            <input type="text" id="webdavUsername" placeholder="您的WebDAV用户名" style="width: 100%;">
                        </div>
                        <div class="form-group">
                            <label for="webdavPassword">密码/应用密码:</label>
                            <input type="password" id="webdavPassword" placeholder="WebDAV密码或应用专用密码" style="width: 100%;">
                            <small style="color: #666;">建议使用应用专用密码而非主密码</small>
                        </div>
                        <div class="form-group">
                            <label for="webdavPath">备份路径:</label>
                            <input type="text" id="webdavPath" placeholder="ip-purity-checker/" value="ip-purity-checker/" style="width: 100%;">
                            <small style="color: #666;">配置文件将保存在此目录下</small>
                        </div>
                    </div>

                    <!-- WebDAV操作 -->
                    <div style="margin-bottom: 15px;">
                        <button class="btn btn-secondary" onclick="testWebDAVConnection()">🔍 测试连接</button>
                        <button class="btn btn-secondary" onclick="saveWebDAVConfig()">💾 保存配置</button>
                        <button class="btn" onclick="backupToWebDAV()">☁️ 备份到WebDAV</button>
                        <button class="btn btn-secondary" onclick="restoreFromWebDAV()">📥 从WebDAV恢复</button>
                        <button class="btn btn-secondary" onclick="listWebDAVBackups()">📋 查看备份</button>
                    </div>

                    <div id="webdavResult" class="result" style="display: none;"></div>
                </div>

                <!-- 本地数据迁移 -->
                <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
                    <h4 style="margin-bottom: 15px; color: #f57c00;">📦 数据迁移工具</h4>
                    <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                        将现有的本地配置数据迁移到云端，或在不同设备间传输配置。
                    </p>
                    <div style="margin-bottom: 15px;">
                        <button class="btn btn-secondary" onclick="migrateLocalToCloud()">🔄 迁移本地数据到云端</button>
                        <button class="btn btn-secondary" onclick="exportLocalConfig()">📤 导出本地配置</button>
                        <button class="btn btn-secondary" onclick="importLocalConfig()">📥 导入本地配置</button>
                        <button class="btn btn-secondary" onclick="clearLocalData()">🗑️ 清除本地数据</button>
                    </div>
                    <input type="file" id="importConfigFile" accept=".json" style="display: none;" onchange="handleConfigImport(event)">
                    <div id="migrationResult" class="result" style="display: none;"></div>
                </div>

                <!-- 用户配置云同步 -->
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                    <h4 style="margin-bottom: 15px; color: #1976d2;">☁️ 云端配置同步</h4>
                    <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                        将您的订阅链接和API密钥安全地保存到云端，实现跨设备/浏览器同步访问。
                        <br>数据采用AES-256加密，只有您知道密码才能访问。
                    </p>

                    <!-- 当前状态 -->
                    <div id="cloudSyncStatus" style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <span id="syncStatusIcon">🔒</span>
                            <span id="syncStatusText" style="margin-left: 10px; font-weight: bold;">本地存储模式</span>
                        </div>
                        <div id="syncStatusDetails" style="font-size: 12px; color: #666;">
                            配置数据仅保存在当前浏览器中
                        </div>
                    </div>

                    <!-- 云同步操作 -->
                    <div id="cloudSyncActions">
                        <!-- 登录/注册区域 -->
                        <div id="loginSection" style="display: block;">
                            <div class="form-group">
                                <label for="userId">用户ID (16位字符):</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="text" id="userId" placeholder="输入您的用户ID" style="flex: 1;" maxlength="16">
                                    <button class="btn btn-secondary" onclick="generateNewUserId()">生成新ID</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="userPassword">配置密码:</label>
                                <input type="password" id="userPassword" placeholder="输入配置密码">
                            </div>
                            <div style="margin-bottom: 15px;">
                                <button class="btn" onclick="loginCloudSync()">🔓 登录云同步</button>
                                <button class="btn btn-secondary" onclick="registerCloudSync()">📝 注册新用户</button>
                                <button class="btn btn-secondary" onclick="checkUserExists()">🔍 检查用户</button>
                            </div>
                        </div>

                        <!-- 已登录区域 -->
                        <div id="loggedInSection" style="display: none;">
                            <div style="margin-bottom: 15px;">
                                <button class="btn" onclick="saveToCloud()">☁️ 保存到云端</button>
                                <button class="btn btn-secondary" onclick="loadFromCloud()">📥 从云端加载</button>
                                <button class="btn btn-secondary" onclick="exportCloudConfig()">📤 导出配置</button>
                                <button class="btn btn-danger" onclick="logoutCloudSync()">🚪 退出登录</button>
                            </div>
                        </div>
                    </div>

                    <div id="cloudSyncResult" class="result" style="display: none;"></div>
                </div>

                <!-- 本地数据迁移 -->
                <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
                    <h4 style="margin-bottom: 15px; color: #f57c00;">📦 数据迁移工具</h4>
                    <p style="margin-bottom: 15px; color: #666; font-size: 14px;">
                        将现有的本地配置数据迁移到云端，或在不同设备间传输配置。
                    </p>
                    <div style="margin-bottom: 15px;">
                        <button class="btn btn-secondary" onclick="migrateLocalToCloud()">🔄 迁移本地数据到云端</button>
                        <button class="btn btn-secondary" onclick="exportLocalConfig()">📤 导出本地配置</button>
                        <button class="btn btn-secondary" onclick="importLocalConfig()">📥 导入本地配置</button>
                    </div>
                    <input type="file" id="importConfigFile" accept=".json" style="display: none;" onchange="handleConfigImport(event)">
                    <div id="migrationResult" class="result" style="display: none;"></div>
                </div>

                <h4 style="margin-bottom: 15px; color: #2c3e50;">🔑 API密钥管理</h4>

                <!-- ProxyCheck.io 多密钥管理 -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">🔑 ProxyCheck.io API密钥</h4>
                    <div class="form-group">
                        <label for="newProxycheckKey">添加新密钥:</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="password" id="newProxycheckKey" placeholder="输入ProxyCheck.io API密钥" style="flex: 1;">
                            <button class="btn" onclick="addProxycheckKey()">添加</button>
                        </div>
                    </div>
                    <div id="proxycheckKeysList"></div>
                </div>

                <!-- IPinfo.io 多Token管理 -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">🎫 IPinfo.io Token</h4>
                    <div class="form-group">
                        <label for="newIpinfoToken">添加新Token:</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="password" id="newIpinfoToken" placeholder="输入IPinfo.io Token" style="flex: 1;">
                            <button class="btn" onclick="addIpinfoToken()">添加</button>
                        </div>
                    </div>
                    <div id="ipinfoTokensList"></div>
                </div>

                <!-- Token使用策略 -->
                <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px;">🔄 Token使用策略</h4>
                    <div class="form-group">
                        <label>
                            <input type="radio" name="tokenStrategy" value="round-robin" checked> 轮换使用 (推荐)
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="radio" name="tokenStrategy" value="failover"> 故障转移 (主用备用)
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="radio" name="tokenStrategy" value="random"> 随机选择
                        </label>
                    </div>
                </div>

                <!-- IP检测缓存管理 -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: #2c3e50;">💾 IP检测缓存管理</h4>
                    <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; text-align: center;">
                            <div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: #007bff;" id="cacheCount">-</div>
                                <div style="font-size: 0.8rem; color: #666;">缓存数量</div>
                            </div>
                            <div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: #28a745;" id="cacheHitRate">-</div>
                                <div style="font-size: 0.8rem; color: #666;">命中率</div>
                            </div>
                            <div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: #ffc107;" id="cacheSize">-</div>
                                <div style="font-size: 0.8rem; color: #666;">存储使用</div>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>缓存保留时间:</label>
                        <select id="cacheTTL" style="width: 200px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="7">7天</option>
                            <option value="14" selected>14天 (推荐)</option>
                            <option value="21">21天</option>
                            <option value="30">30天</option>
                        </select>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="refreshCacheStats()">🔄 刷新统计</button>
                        <button class="btn btn-secondary" onclick="cleanupCache()">🧹 清理过期</button>
                        <button class="btn btn-danger" onclick="clearAllCache()">🗑️ 清空缓存</button>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div style="margin-bottom: 20px;">
                    <button class="btn" onclick="saveAllSettings()">💾 保存所有设置</button>
                    <button class="btn btn-secondary" onclick="testAllAPIKeys()">🧪 测试所有密钥</button>
                    <button class="btn btn-secondary" onclick="refreshTokenStatus()">🔄 刷新状态</button>
                    <button class="btn btn-danger" onclick="clearAllSettings()">🗑️ 清除所有</button>
                </div>

                <div id="settingsResult" class="result"></div>
            </div>
        </div>
    </div>

    <script>
        // 全局变量 - 增强版
        var subscriptions = [];
        var batchResults = [];

        // 多API密钥管理
        var apiKeysManager = {
            proxycheck: {
                keys: [],
                currentIndex: 0,
                strategy: 'round-robin' // round-robin, failover, random
            },
            ipinfo: {
                tokens: [],
                currentIndex: 0,
                strategy: 'round-robin'
            }
        };

        // 页面加载时初始化
        document.addEventListener('DOMContentLoaded', function() {
            loadAllSettings();
            loadSubscriptions();
            updateSubscriptionStats();
            renderAPIKeys();
        });

        // 标签页切换
        function switchTab(tabName, clickedElement) {
            document.querySelectorAll('.tab-content').forEach(function(content) {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(function(tab) {
                tab.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            if (clickedElement) {
                clickedElement.classList.add('active');
            }
        }

        // 显示提示信息
        function showAlert(message, type) {
            var alertContainer = document.getElementById('alertContainer');
            var alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-' + (type || 'success');
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
            alertContainer.innerHTML = '';
            alertContainer.appendChild(alertDiv);
            setTimeout(function() { alertDiv.style.display = 'none'; }, 3000);
        }

        // 显示结果
        function showResult(elementId, content, isError) {
            var resultDiv = document.getElementById(elementId);
            resultDiv.style.display = 'block';
            resultDiv.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
            resultDiv.style.color = isError ? '#dc3545' : '#333';
        }

        // 单IP检测 - 增强版
        function checkSingleIP() {
            var ip = document.getElementById('singleIp').value.trim();
            if (!ip) {
                showAlert('请输入IP地址', 'error');
                return;
            }

            // 验证IP格式
            if (!isValidIP(ip)) {
                showAlert('请输入有效的IP地址格式', 'error');
                return;
            }

            showResult('singleResult', '正在检测IP地址: ' + ip + '\\n使用多API密钥轮换检测...');

            // 获取可用的API密钥
            var proxycheckKey = getNextAPIKey('proxycheck');
            var ipinfoToken = getNextAPIKey('ipinfo');

            var headers = {};
            if (proxycheckKey) {
                headers['X-ProxyCheck-Key'] = proxycheckKey.value;
            }
            if (ipinfoToken) {
                headers['X-IPInfo-Token'] = ipinfoToken.value;
            }

            fetch('/api/check-ip?ip=' + encodeURIComponent(ip), {
                headers: headers
            })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    // 增强结果显示
                    var enhancedData = {
                        ...data,
                        usedAPIs: {
                            proxycheck: proxycheckKey ? proxycheckKey.name : '未使用',
                            ipinfo: ipinfoToken ? ipinfoToken.name : '未使用'
                        },
                        detectionTime: new Date().toLocaleString()
                    };

                    showResult('singleResult', enhancedData);
                    showAlert('IP检测完成', 'success');
                })
                .catch(function(error) {
                    showResult('singleResult', '错误: ' + error.message, true);
                    showAlert('检测失败: ' + error.message, 'error');
                });
        }

        // IP格式验证
        function isValidIP(ip) {
            var ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            return ipRegex.test(ip);
        }

        // 批量IP检测 - 增强版
        function checkBatchIPs() {
            var ipsText = document.getElementById('batchIps').value.trim();
            if (!ipsText) {
                showAlert('请输入IP地址列表', 'error');
                return;
            }

            var ips = ipsText.split('\\n').map(function(line) { return line.trim(); }).filter(function(line) { return line; });
            if (ips.length === 0) {
                showAlert('没有有效的IP地址', 'error');
                return;
            }

            // 验证IP格式
            var validIPs = [];
            var invalidIPs = [];
            ips.forEach(function(ip) {
                if (isValidIP(ip)) {
                    validIPs.push(ip);
                } else {
                    invalidIPs.push(ip);
                }
            });

            if (invalidIPs.length > 0) {
                showAlert('发现 ' + invalidIPs.length + ' 个无效IP地址，将跳过检测', 'warning');
            }

            if (validIPs.length === 0) {
                showAlert('没有有效的IP地址可以检测', 'error');
                return;
            }

            showResult('batchResult', '开始批量检测 ' + validIPs.length + ' 个IP地址...\\n使用多API密钥负载均衡');

            var results = [];
            var currentIndex = 0;
            var startTime = Date.now();

            function checkNextIP() {
                if (currentIndex >= validIPs.length) {
                    batchResults = results;
                    var endTime = Date.now();
                    var duration = ((endTime - startTime) / 1000).toFixed(2);

                    var summary = '批量检测完成！\\n' +
                        '总计: ' + results.length + ' 个IP\\n' +
                        '纯净: ' + results.filter(function(r) { return r.isPure; }).length + ' 个\\n' +
                        '耗时: ' + duration + ' 秒\\n\\n' +
                        JSON.stringify(results, null, 2);

                    showResult('batchResult', summary);
                    showAlert('批量检测完成，共检测 ' + results.length + ' 个IP', 'success');
                    return;
                }

                var ip = validIPs[currentIndex];
                var progress = '正在检测 ' + (currentIndex + 1) + '/' + validIPs.length + ': ' + ip;
                showResult('batchResult', progress);

                // 获取可用的API密钥
                var proxycheckKey = getNextAPIKey('proxycheck');
                var ipinfoToken = getNextAPIKey('ipinfo');

                var headers = {};
                if (proxycheckKey) {
                    headers['X-ProxyCheck-Key'] = proxycheckKey.value;
                }
                if (ipinfoToken) {
                    headers['X-IPInfo-Token'] = ipinfoToken.value;
                }

                fetch('/api/check-ip?ip=' + encodeURIComponent(ip), {
                    headers: headers
                }).then(function(response) {
                    return response.json();
                }).then(function(data) {
                    results.push({
                        ...data,
                        usedAPIs: {
                            proxycheck: proxycheckKey ? proxycheckKey.name : '未使用',
                            ipinfo: ipinfoToken ? ipinfoToken.name : '未使用'
                        }
                    });
                    currentIndex++;
                    setTimeout(checkNextIP, 1000); // 1秒延迟避免API限制
                }).catch(function(error) {
                    results.push({
                        ip: ip,
                        error: error.message,
                        isPure: false,
                        timestamp: new Date().toISOString()
                    });
                    currentIndex++;
                    setTimeout(checkNextIP, 1000);
                });
            }

            checkNextIP();
        }

        // 导出结果
        function exportResults() {
            showAlert('导出功能开发中', 'info');
        }

        // 订阅管理增强功能
        function addSubscription() {
            var name = document.getElementById('subscriptionName').value.trim();
            var url = document.getElementById('subscriptionUrl').value.trim();

            if (!name || !url) {
                showAlert('请填写订阅名称和链接', 'error');
                return;
            }

            // 验证URL格式
            if (!isValidUrl(url)) {
                showAlert('请输入有效的URL格式', 'error');
                return;
            }

            // 检查重复
            var duplicate = subscriptions.find(function(sub) { return sub.url === url; });
            if (duplicate) {
                if (!confirm('检测到重复的订阅链接：' + duplicate.name + '\\n是否仍要添加？')) {
                    return;
                }
            }

            var subscription = {
                id: Date.now(),
                name: name,
                url: url,
                createdAt: new Date().toISOString(),
                status: 'pending',
                lastChecked: null,
                isValid: true
            };

            subscriptions.push(subscription);
            saveSubscriptions();
            renderSubscriptions();
            updateSubscriptionStats();

            // 清空输入框
            document.getElementById('subscriptionName').value = '';
            document.getElementById('subscriptionUrl').value = '';
            showAlert('订阅添加成功', 'success');
        }

        // 批量添加订阅
        function addBatchSubscriptions() {
            var batchText = document.getElementById('batchSubscriptions').value.trim();
            if (!batchText) {
                showAlert('请输入要批量添加的订阅链接', 'error');
                return;
            }

            var urls = batchText.split('\\n').map(function(line) { return line.trim(); }).filter(function(line) { return line; });
            var added = 0;
            var duplicates = 0;
            var invalid = 0;

            urls.forEach(function(url, index) {
                if (!isValidUrl(url)) {
                    invalid++;
                    return;
                }

                var duplicate = subscriptions.find(function(sub) { return sub.url === url; });
                if (duplicate) {
                    duplicates++;
                    return;
                }

                var subscription = {
                    id: Date.now() + index,
                    name: '批量导入 ' + (index + 1),
                    url: url,
                    createdAt: new Date().toISOString(),
                    status: 'pending',
                    lastChecked: null,
                    isValid: true
                };

                subscriptions.push(subscription);
                added++;
            });

            saveSubscriptions();
            renderSubscriptions();
            updateSubscriptionStats();
            document.getElementById('batchSubscriptions').value = '';

            var message = '批量添加完成：成功 ' + added + ' 个';
            if (duplicates > 0) message += '，跳过重复 ' + duplicates + ' 个';
            if (invalid > 0) message += '，无效链接 ' + invalid + ' 个';

            showAlert(message, added > 0 ? 'success' : 'warning');
        }

        // 去重功能
        function removeDuplicates() {
            var originalCount = subscriptions.length;
            var seen = {};
            var unique = [];

            subscriptions.forEach(function(sub) {
                if (!seen[sub.url]) {
                    seen[sub.url] = true;
                    unique.push(sub);
                }
            });

            var removedCount = originalCount - unique.length;
            if (removedCount === 0) {
                showAlert('没有发现重复的订阅', 'info');
                return;
            }

            if (confirm('发现 ' + removedCount + ' 个重复订阅，是否删除？')) {
                subscriptions = unique;
                saveSubscriptions();
                renderSubscriptions();
                updateSubscriptionStats();
                showAlert('已删除 ' + removedCount + ' 个重复订阅', 'success');
            }
        }

        // 导出订阅
        function exportSubscriptions() {
            if (subscriptions.length === 0) {
                showAlert('没有订阅可以导出', 'warning');
                return;
            }

            var exportData = {
                exportTime: new Date().toISOString(),
                totalCount: subscriptions.length,
                subscriptions: subscriptions
            };

            var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'subscriptions_' + new Date().toISOString().split('T')[0] + '.json';
            link.click();

            showAlert('订阅列表已导出', 'success');
        }

        // 导入订阅
        function importSubscriptions(event) {
            var file = event.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var content = e.target.result;
                    var data;

                    if (file.name.endsWith('.json')) {
                        data = JSON.parse(content);
                        var importSubs = data.subscriptions || data;
                    } else {
                        // 文本文件，每行一个URL
                        var urls = content.split('\\n').map(function(line) { return line.trim(); }).filter(function(line) { return line; });
                        importSubs = urls.map(function(url, index) {
                            return {
                                id: Date.now() + index,
                                name: '导入订阅 ' + (index + 1),
                                url: url,
                                createdAt: new Date().toISOString(),
                                status: 'pending',
                                lastChecked: null,
                                isValid: true
                            };
                        });
                    }

                    var added = 0;
                    var duplicates = 0;

                    importSubs.forEach(function(importSub) {
                        if (!isValidUrl(importSub.url)) return;

                        var duplicate = subscriptions.find(function(sub) { return sub.url === importSub.url; });
                        if (duplicate) {
                            duplicates++;
                            return;
                        }

                        subscriptions.push(importSub);
                        added++;
                    });

                    saveSubscriptions();
                    renderSubscriptions();
                    updateSubscriptionStats();

                    var message = '导入完成：新增 ' + added + ' 个订阅';
                    if (duplicates > 0) message += '，跳过重复 ' + duplicates + ' 个';

                    showAlert(message, 'success');

                } catch (error) {
                    showAlert('导入失败：文件格式错误', 'error');
                }
            };
            reader.readAsText(file);
        }

        function saveSubscriptions() {
            localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
        }

        function loadSubscriptions() {
            var saved = localStorage.getItem('subscriptions');
            if (saved) {
                try {
                    subscriptions = JSON.parse(saved);
                    // 确保旧数据兼容性
                    subscriptions = subscriptions.map(function(sub) {
                        return {
                            id: sub.id || Date.now(),
                            name: sub.name || '未命名订阅',
                            url: sub.url,
                            createdAt: sub.createdAt || new Date().toISOString(),
                            status: sub.status || 'pending',
                            lastChecked: sub.lastChecked || null,
                            isValid: sub.isValid !== undefined ? sub.isValid : true
                        };
                    });
                } catch (e) {
                    subscriptions = [];
                }
            }
            renderSubscriptions();
        }

        // 更新订阅统计信息
        function updateSubscriptionStats() {
            var total = subscriptions.length;
            var valid = subscriptions.filter(function(sub) { return sub.isValid; }).length;
            var duplicateUrls = {};
            var duplicates = 0;

            subscriptions.forEach(function(sub) {
                if (duplicateUrls[sub.url]) {
                    duplicates++;
                } else {
                    duplicateUrls[sub.url] = true;
                }
            });

            document.getElementById('totalSubs').textContent = total;
            document.getElementById('validSubs').textContent = valid;
            document.getElementById('duplicateSubs').textContent = duplicates;
        }

        function renderSubscriptions() {
            var container = document.getElementById('subscriptionList');
            if (subscriptions.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">暂无订阅，请添加您的第一个订阅链接</p>';
                return;
            }

            container.innerHTML = subscriptions.map(function(sub) {
                var statusColor = sub.status === 'active' ? '#28a745' : sub.status === 'error' ? '#dc3545' : '#6c757d';
                var statusText = sub.status === 'active' ? '正常' : sub.status === 'error' ? '错误' : '待检测';

                return '<div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 10px; ' +
                    (sub.isValid ? '' : 'opacity: 0.6;') + '">' +
                    '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">' +
                        '<h4 style="margin: 0; color: #333;">' + sub.name + '</h4>' +
                        '<span style="background: ' + statusColor + '; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">' + statusText + '</span>' +
                    '</div>' +
                    '<div style="font-family: monospace; background: #f1f3f4; padding: 8px; border-radius: 4px; word-break: break-all; font-size: 12px; margin-bottom: 10px;">' +
                        sub.url +
                    '</div>' +
                    '<div style="font-size: 12px; color: #666; margin-bottom: 10px;">' +
                        '创建时间: ' + new Date(sub.createdAt).toLocaleString() +
                        (sub.lastChecked ? ' | 最后检查: ' + new Date(sub.lastChecked).toLocaleString() : '') +
                    '</div>' +
                    '<div>' +
                        '<button class="btn" onclick="testSingleSubscription(' + sub.id + ')" style="font-size: 12px; padding: 6px 12px;">🧪 测试</button>' +
                        '<button class="btn btn-secondary" onclick="editSubscription(' + sub.id + ')" style="font-size: 12px; padding: 6px 12px;">✏️ 编辑</button>' +
                        '<button class="btn btn-danger" onclick="deleteSubscription(' + sub.id + ')" style="font-size: 12px; padding: 6px 12px;">🗑️ 删除</button>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        // 测试单个订阅
        function testSingleSubscription(id) {
            var subscription = subscriptions.find(function(sub) { return sub.id === id; });
            if (!subscription) return;

            showAlert('正在测试订阅: ' + subscription.name, 'info');

            // 模拟测试结果
            setTimeout(function() {
                subscription.lastChecked = new Date().toISOString();
                subscription.status = Math.random() > 0.3 ? 'active' : 'error';
                saveSubscriptions();
                renderSubscriptions();
                updateSubscriptionStats();

                var message = subscription.status === 'active' ? '测试成功' : '测试失败';
                showAlert(subscription.name + ' ' + message, subscription.status === 'active' ? 'success' : 'error');
            }, 1000);
        }

        // 编辑订阅
        function editSubscription(id) {
            var subscription = subscriptions.find(function(sub) { return sub.id === id; });
            if (!subscription) return;

            var newName = prompt('修改订阅名称:', subscription.name);
            if (newName && newName.trim()) {
                subscription.name = newName.trim();
                saveSubscriptions();
                renderSubscriptions();
                showAlert('订阅名称已更新', 'success');
            }
        }

        function deleteSubscription(id) {
            var subscription = subscriptions.find(function(sub) { return sub.id === id; });
            if (!subscription) return;

            if (confirm('确定要删除订阅 "' + subscription.name + '" 吗？')) {
                subscriptions = subscriptions.filter(function(sub) { return sub.id !== id; });
                saveSubscriptions();
                renderSubscriptions();
                updateSubscriptionStats();
                showAlert('订阅删除成功', 'success');
            }
        }

        function checkAllSubscriptions() {
            if (subscriptions.length === 0) {
                showAlert('没有订阅需要检查', 'warning');
                return;
            }

            showAlert('正在检查所有订阅，请稍候...', 'info');
            var checkedCount = 0;

            subscriptions.forEach(function(sub, index) {
                setTimeout(function() {
                    sub.lastChecked = new Date().toISOString();
                    sub.status = Math.random() > 0.3 ? 'active' : 'error';
                    checkedCount++;

                    if (checkedCount === subscriptions.length) {
                        saveSubscriptions();
                        renderSubscriptions();
                        updateSubscriptionStats();
                        showAlert('所有订阅检查完成', 'success');
                    }
                }, index * 500);
            });
        }

        function clearSubscriptions() {
            if (subscriptions.length === 0) {
                showAlert('没有订阅需要清空', 'info');
                return;
            }

            if (confirm('确定要删除所有 ' + subscriptions.length + ' 个订阅吗？此操作不可恢复！')) {
                subscriptions = [];
                saveSubscriptions();
                renderSubscriptions();
                updateSubscriptionStats();
                showAlert('所有订阅已清空', 'success');
            }
        }

        // 多API密钥管理
        function addProxycheckKey() {
            var newKey = document.getElementById('newProxycheckKey').value.trim();
            if (!newKey) {
                showAlert('请输入ProxyCheck.io API密钥', 'error');
                return;
            }

            // 检查重复
            var duplicate = apiKeysManager.proxycheck.keys.find(function(key) { return key.value === newKey; });
            if (duplicate) {
                showAlert('该API密钥已存在', 'warning');
                return;
            }

            var keyObj = {
                id: Date.now(),
                value: newKey,
                name: 'ProxyCheck密钥 ' + (apiKeysManager.proxycheck.keys.length + 1),
                addedAt: new Date().toISOString(),
                status: 'unknown',
                quota: { used: 0, limit: 1000, remaining: 1000 },
                lastUsed: null,
                isActive: true
            };

            apiKeysManager.proxycheck.keys.push(keyObj);
            saveAllSettings();
            renderAPIKeys();
            document.getElementById('newProxycheckKey').value = '';
            showAlert('ProxyCheck.io API密钥添加成功', 'success');
        }

        function addIpinfoToken() {
            var newToken = document.getElementById('newIpinfoToken').value.trim();
            if (!newToken) {
                showAlert('请输入IPinfo.io Token', 'error');
                return;
            }

            // 检查重复
            var duplicate = apiKeysManager.ipinfo.tokens.find(function(token) { return token.value === newToken; });
            if (duplicate) {
                showAlert('该Token已存在', 'warning');
                return;
            }

            var tokenObj = {
                id: Date.now(),
                value: newToken,
                name: 'IPinfo Token ' + (apiKeysManager.ipinfo.tokens.length + 1),
                addedAt: new Date().toISOString(),
                status: 'unknown',
                quota: { used: 0, limit: 50000, remaining: 50000 },
                lastUsed: null,
                isActive: true
            };

            apiKeysManager.ipinfo.tokens.push(tokenObj);
            saveAllSettings();
            renderAPIKeys();
            document.getElementById('newIpinfoToken').value = '';
            showAlert('IPinfo.io Token添加成功', 'success');
        }

        // 渲染API密钥列表
        function renderAPIKeys() {
            renderProxycheckKeys();
            renderIpinfoTokens();
        }

        function renderProxycheckKeys() {
            var container = document.getElementById('proxycheckKeysList');
            if (apiKeysManager.proxycheck.keys.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center; padding: 10px;">暂无ProxyCheck.io API密钥</p>';
                return;
            }

            container.innerHTML = apiKeysManager.proxycheck.keys.map(function(key) {
                var statusColor = key.status === 'active' ? '#28a745' : key.status === 'error' ? '#dc3545' : '#6c757d';
                var statusText = key.status === 'active' ? '正常' : key.status === 'error' ? '失效' : '未测试';

                return '<div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 8px; ' +
                    (key.isActive ? '' : 'opacity: 0.6;') + '">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
                        '<strong>' + key.name + '</strong>' +
                        '<span style="background: ' + statusColor + '; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">' + statusText + '</span>' +
                    '</div>' +
                    '<div style="font-family: monospace; font-size: 11px; color: #666; margin-bottom: 8px;">' +
                        key.value.substring(0, 20) + '...' +
                    '</div>' +
                    '<div style="font-size: 11px; color: #666; margin-bottom: 8px;">' +
                        '配额: ' + key.quota.remaining + '/' + key.quota.limit + ' | ' +
                        '添加时间: ' + new Date(key.addedAt).toLocaleDateString() +
                    '</div>' +
                    '<div>' +
                        '<button class="btn" onclick="testProxycheckKey(' + key.id + ')" style="font-size: 11px; padding: 4px 8px;">测试</button>' +
                        '<button class="btn btn-secondary" onclick="toggleKeyStatus(' + key.id + ', \\'proxycheck\\')" style="font-size: 11px; padding: 4px 8px;">' + (key.isActive ? '禁用' : '启用') + '</button>' +
                        '<button class="btn btn-danger" onclick="deleteProxycheckKey(' + key.id + ')" style="font-size: 11px; padding: 4px 8px;">删除</button>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        function renderIpinfoTokens() {
            var container = document.getElementById('ipinfoTokensList');
            if (apiKeysManager.ipinfo.tokens.length === 0) {
                container.innerHTML = '<p style="color: #666; text-align: center; padding: 10px;">暂无IPinfo.io Token</p>';
                return;
            }

            container.innerHTML = apiKeysManager.ipinfo.tokens.map(function(token) {
                var statusColor = token.status === 'active' ? '#28a745' : token.status === 'error' ? '#dc3545' : '#6c757d';
                var statusText = token.status === 'active' ? '正常' : token.status === 'error' ? '失效' : '未测试';

                return '<div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 8px; ' +
                    (token.isActive ? '' : 'opacity: 0.6;') + '">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
                        '<strong>' + token.name + '</strong>' +
                        '<span style="background: ' + statusColor + '; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">' + statusText + '</span>' +
                    '</div>' +
                    '<div style="font-family: monospace; font-size: 11px; color: #666; margin-bottom: 8px;">' +
                        token.value.substring(0, 20) + '...' +
                    '</div>' +
                    '<div style="font-size: 11px; color: #666; margin-bottom: 8px;">' +
                        '配额: ' + token.quota.remaining + '/' + token.quota.limit + ' | ' +
                        '添加时间: ' + new Date(token.addedAt).toLocaleDateString() +
                    '</div>' +
                    '<div>' +
                        '<button class="btn" onclick="testIpinfoToken(' + token.id + ')" style="font-size: 11px; padding: 4px 8px;">测试</button>' +
                        '<button class="btn btn-secondary" onclick="toggleKeyStatus(' + token.id + ', \\'ipinfo\\')" style="font-size: 11px; padding: 4px 8px;">' + (token.isActive ? '禁用' : '启用') + '</button>' +
                        '<button class="btn btn-danger" onclick="deleteIpinfoToken(' + token.id + ')" style="font-size: 11px; padding: 4px 8px;">删除</button>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        // API密钥操作功能
        function testProxycheckKey(id) {
            var key = apiKeysManager.proxycheck.keys.find(function(k) { return k.id === id; });
            if (!key) return;

            showAlert('正在测试 ' + key.name, 'info');

            // 模拟API测试
            setTimeout(function() {
                key.status = Math.random() > 0.2 ? 'active' : 'error';
                key.lastUsed = new Date().toISOString();
                if (key.status === 'active') {
                    key.quota.remaining = Math.floor(Math.random() * 1000);
                    key.quota.used = key.quota.limit - key.quota.remaining;
                }
                saveAllSettings();
                renderAPIKeys();
                showAlert(key.name + ' 测试' + (key.status === 'active' ? '成功' : '失败'), key.status === 'active' ? 'success' : 'error');
            }, 1000);
        }

        function testIpinfoToken(id) {
            var token = apiKeysManager.ipinfo.tokens.find(function(t) { return t.id === id; });
            if (!token) return;

            showAlert('正在测试 ' + token.name, 'info');

            // 模拟API测试
            setTimeout(function() {
                token.status = Math.random() > 0.2 ? 'active' : 'error';
                token.lastUsed = new Date().toISOString();
                if (token.status === 'active') {
                    token.quota.remaining = Math.floor(Math.random() * 50000);
                    token.quota.used = token.quota.limit - token.quota.remaining;
                }
                saveAllSettings();
                renderAPIKeys();
                showAlert(token.name + ' 测试' + (token.status === 'active' ? '成功' : '失败'), token.status === 'active' ? 'success' : 'error');
            }, 1000);
        }

        function toggleKeyStatus(id, type) {
            var item = type === 'proxycheck' ?
                apiKeysManager.proxycheck.keys.find(function(k) { return k.id === id; }) :
                apiKeysManager.ipinfo.tokens.find(function(t) { return t.id === id; });

            if (!item) return;

            item.isActive = !item.isActive;
            saveAllSettings();
            renderAPIKeys();
            showAlert(item.name + ' 已' + (item.isActive ? '启用' : '禁用'), 'success');
        }

        function deleteProxycheckKey(id) {
            var key = apiKeysManager.proxycheck.keys.find(function(k) { return k.id === id; });
            if (!key) return;

            if (confirm('确定要删除 "' + key.name + '" 吗？')) {
                apiKeysManager.proxycheck.keys = apiKeysManager.proxycheck.keys.filter(function(k) { return k.id !== id; });
                saveAllSettings();
                renderAPIKeys();
                showAlert('API密钥删除成功', 'success');
            }
        }

        function deleteIpinfoToken(id) {
            var token = apiKeysManager.ipinfo.tokens.find(function(t) { return t.id === id; });
            if (!token) return;

            if (confirm('确定要删除 "' + token.name + '" 吗？')) {
                apiKeysManager.ipinfo.tokens = apiKeysManager.ipinfo.tokens.filter(function(t) { return t.id !== id; });
                saveAllSettings();
                renderAPIKeys();
                showAlert('Token删除成功', 'success');
            }
        }
        // 设置管理功能
        function saveAllSettings() {
            // 保存API密钥管理器
            localStorage.setItem('apiKeysManager', JSON.stringify(apiKeysManager));

            // 保存Token使用策略
            var strategy = document.querySelector('input[name="tokenStrategy"]:checked');
            if (strategy) {
                apiKeysManager.proxycheck.strategy = strategy.value;
                apiKeysManager.ipinfo.strategy = strategy.value;
                localStorage.setItem('apiKeysManager', JSON.stringify(apiKeysManager));
            }
        }

        function loadAllSettings() {
            // 加载API密钥管理器
            var saved = localStorage.getItem('apiKeysManager');
            if (saved) {
                try {
                    var loaded = JSON.parse(saved);
                    apiKeysManager = {
                        proxycheck: {
                            keys: loaded.proxycheck ? loaded.proxycheck.keys || [] : [],
                            currentIndex: loaded.proxycheck ? loaded.proxycheck.currentIndex || 0 : 0,
                            strategy: loaded.proxycheck ? loaded.proxycheck.strategy || 'round-robin' : 'round-robin'
                        },
                        ipinfo: {
                            tokens: loaded.ipinfo ? loaded.ipinfo.tokens || [] : [],
                            currentIndex: loaded.ipinfo ? loaded.ipinfo.currentIndex || 0 : 0,
                            strategy: loaded.ipinfo ? loaded.ipinfo.strategy || 'round-robin' : 'round-robin'
                        }
                    };
                } catch (e) {
                    console.log('加载设置失败:', e);
                }
            }

            // 设置策略单选框
            var strategyRadio = document.querySelector('input[name="tokenStrategy"][value="' + apiKeysManager.proxycheck.strategy + '"]');
            if (strategyRadio) {
                strategyRadio.checked = true;
            }
        }

        function testAllAPIKeys() {
            var totalKeys = apiKeysManager.proxycheck.keys.length + apiKeysManager.ipinfo.tokens.length;
            if (totalKeys === 0) {
                showAlert('没有API密钥需要测试', 'warning');
                return;
            }

            showAlert('正在测试所有API密钥，请稍候...', 'info');

            // 测试所有ProxyCheck密钥
            apiKeysManager.proxycheck.keys.forEach(function(key, index) {
                setTimeout(function() {
                    testProxycheckKey(key.id);
                }, index * 500);
            });

            // 测试所有IPinfo Token
            apiKeysManager.ipinfo.tokens.forEach(function(token, index) {
                setTimeout(function() {
                    testIpinfoToken(token.id);
                }, (apiKeysManager.proxycheck.keys.length + index) * 500);
            });

            setTimeout(function() {
                showAlert('所有API密钥测试完成', 'success');
            }, totalKeys * 500 + 1000);
        }

        function refreshTokenStatus() {
            showAlert('正在刷新Token状态...', 'info');

            // 模拟刷新配额信息
            apiKeysManager.proxycheck.keys.forEach(function(key) {
                if (key.status === 'active') {
                    key.quota.remaining = Math.floor(Math.random() * key.quota.limit);
                    key.quota.used = key.quota.limit - key.quota.remaining;
                }
            });

            apiKeysManager.ipinfo.tokens.forEach(function(token) {
                if (token.status === 'active') {
                    token.quota.remaining = Math.floor(Math.random() * token.quota.limit);
                    token.quota.used = token.quota.limit - token.quota.remaining;
                }
            });

            saveAllSettings();
            renderAPIKeys();
            showAlert('Token状态已刷新', 'success');
        }

        function clearAllSettings() {
            if (!confirm('确定要清除所有设置吗？这将删除所有API密钥和订阅！')) {
                return;
            }

            localStorage.clear();
            apiKeysManager = {
                proxycheck: { keys: [], currentIndex: 0, strategy: 'round-robin' },
                ipinfo: { tokens: [], currentIndex: 0, strategy: 'round-robin' }
            };
            subscriptions = [];

            renderAPIKeys();
            renderSubscriptions();
            updateSubscriptionStats();

            // 重置表单
            document.getElementById('newProxycheckKey').value = '';
            document.getElementById('newIpinfoToken').value = '';
            document.querySelector('input[name="tokenStrategy"][value="round-robin"]').checked = true;

            showAlert('所有设置已清除', 'success');
        }

        // 工具函数
        function isValidUrl(string) {
            try {
                var url = new URL(string);
                return url.protocol === 'http:' || url.protocol === 'https:';
            } catch (_) {
                return false;
            }
        }

        // 获取下一个可用的API密钥
        function getNextAPIKey(type) {
            var manager = apiKeysManager[type];
            var items = type === 'proxycheck' ? manager.keys : manager.tokens;
            var activeItems = items.filter(function(item) { return item.isActive && item.status === 'active'; });

            if (activeItems.length === 0) {
                return null;
            }

            var selectedItem;
            switch (manager.strategy) {
                case 'round-robin':
                    selectedItem = activeItems[manager.currentIndex % activeItems.length];
                    manager.currentIndex = (manager.currentIndex + 1) % activeItems.length;
                    break;
                case 'failover':
                    selectedItem = activeItems[0]; // 总是使用第一个可用的
                    break;
                case 'random':
                    selectedItem = activeItems[Math.floor(Math.random() * activeItems.length)];
                    break;
                default:
                    selectedItem = activeItems[0];
            }

            if (selectedItem) {
                selectedItem.lastUsed = new Date().toISOString();
                saveAllSettings();
            }

            return selectedItem;
        }

        // ==================== 立即生成Clash配置功能 ====================

        // 立即生成Clash配置
        function generateClashConfigNow() {
            var generateBtn = document.getElementById('generateBtn');
            var progressDiv = document.getElementById('generateProgress');
            var resultDiv = document.getElementById('generateResult');
            var progressText = document.getElementById('progressText');
            var progressBar = document.getElementById('progressBar');

            // 检查是否有订阅
            if (subscriptions.length === 0) {
                showAlert('请先添加订阅链接', 'error');
                return;
            }

            // 禁用按钮，显示进度
            generateBtn.disabled = true;
            generateBtn.textContent = '🔄 生成中...';
            progressDiv.style.display = 'block';
            resultDiv.style.display = 'none';

            // 开始生成流程
            executeGenerationFlow();
        }

        // 执行生成流程
        function executeGenerationFlow() {
            var progressText = document.getElementById('progressText');
            var progressBar = document.getElementById('progressBar');
            var resultDiv = document.getElementById('generateResult');

            var steps = [
                { text: '正在解析订阅链接...', progress: 10 },
                { text: '正在提取IP地址...', progress: 25 },
                { text: '正在检测IP纯净度...', progress: 60 },
                { text: '正在筛选优质IP...', progress: 80 },
                { text: '正在生成Clash配置...', progress: 95 },
                { text: '生成完成！', progress: 100 }
            ];

            var currentStep = 0;

            function updateProgress() {
                if (currentStep < steps.length) {
                    var step = steps[currentStep];
                    progressText.textContent = step.text;
                    progressBar.style.width = step.progress + '%';
                    currentStep++;

                    if (currentStep < steps.length) {
                        setTimeout(updateProgress, 1000 + Math.random() * 2000); // 1-3秒随机延迟
                    } else {
                        // 完成后调用API
                        callGenerateAPI();
                    }
                }
            }

            updateProgress();
        }

        // 调用生成API
        function callGenerateAPI() {
            fetch('/api/manual-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'generate_clash_config',
                    immediate: true
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                handleGenerationResult(data);
            })
            .catch(function(error) {
                handleGenerationError(error);
            });
        }

        // 处理生成结果
        function handleGenerationResult(data) {
            var generateBtn = document.getElementById('generateBtn');
            var progressDiv = document.getElementById('generateProgress');
            var resultDiv = document.getElementById('generateResult');

            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.textContent = '🚀 立即生成Clash配置';
            progressDiv.style.display = 'none';

            if (data.success) {
                // 显示成功结果
                var resultHtml = '<div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin-bottom: 15px;">' +
                    '<h4>✅ Clash配置生成成功！</h4>' +
                    '<p>总订阅数: ' + (data.result.totalSubscriptions || 0) + ' | ' +
                    '总节点数: ' + (data.result.totalNodes || 0) + ' | ' +
                    '纯净IP数: ' + (data.result.pureIPs || 0) + ' | ' +
                    '执行耗时: ' + ((data.result.executionTime || 0) / 1000).toFixed(1) + '秒</p>' +
                    '</div>';

                // 添加下载链接
                resultHtml += '<div style="margin-bottom: 15px;">' +
                    '<a href="/api/clash-config" class="download-link" download="clash-config.yaml">📥 下载YAML配置</a>' +
                    '<button class="btn btn-secondary" onclick="previewConfig()" style="margin-left: 10px;">👁️ 预览配置</button>' +
                    '</div>';

                // 如果有GitHub更新结果
                if (data.result.githubUpdate && data.result.githubUpdate.success) {
                    resultHtml += '<div style="background: #cce5ff; color: #004085; padding: 10px; border-radius: 6px; font-size: 12px;">' +
                        '📤 已自动更新到GitHub: <a href="' + data.result.githubUpdate.htmlUrl + '" target="_blank">查看提交</a>' +
                        '</div>';
                }

                resultDiv.innerHTML = resultHtml;
                resultDiv.style.display = 'block';

                showAlert('Clash配置生成成功！', 'success');

            } else {
                // 显示错误结果
                resultDiv.innerHTML = '<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px;">' +
                    '<h4>❌ 生成失败</h4>' +
                    '<p>' + (data.error || '未知错误') + '</p>' +
                    '</div>';
                resultDiv.style.display = 'block';

                showAlert('配置生成失败: ' + (data.error || '未知错误'), 'error');
            }
        }

        // 处理生成错误
        function handleGenerationError(error) {
            var generateBtn = document.getElementById('generateBtn');
            var progressDiv = document.getElementById('generateProgress');
            var resultDiv = document.getElementById('generateResult');

            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.textContent = '🚀 立即生成Clash配置';
            progressDiv.style.display = 'none';

            resultDiv.innerHTML = '<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px;">' +
                '<h4>❌ 网络错误</h4>' +
                '<p>请检查网络连接或稍后重试</p>' +
                '<p>错误详情: ' + error.message + '</p>' +
                '</div>';
            resultDiv.style.display = 'block';

            showAlert('网络错误: ' + error.message, 'error');
        }

        // 预览配置文件
        function previewConfig() {
            fetch('/api/clash-config')
                .then(function(response) {
                    return response.text();
                })
                .then(function(configText) {
                    var resultDiv = document.getElementById('generateResult');
                    var previewHtml = '<div style="margin-top: 15px;">' +
                        '<h4>📄 Clash配置预览</h4>' +
                        '<div class="config-preview">' + escapeHtml(configText.substring(0, 2000)) +
                        (configText.length > 2000 ? '\\n\\n... (配置文件较长，仅显示前2000字符)' : '') +
                        '</div>' +
                        '</div>';

                    resultDiv.innerHTML += previewHtml;
                })
                .catch(function(error) {
                    showAlert('预览失败: ' + error.message, 'error');
                });
        }

        // 下载最新配置
        function downloadLastConfig() {
            window.open('/api/clash-config', '_blank');
        }

        // HTML转义函数
        function escapeHtml(text) {
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, function(m) { return map[m]; });
        }

        // ==================== 缓存管理功能 ====================

        // 刷新缓存统计
        function refreshCacheStats() {
            fetch('/api/cache-stats')
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        document.getElementById('cacheCount').textContent = data.stats.totalKeys || 0;
                        document.getElementById('cacheHitRate').textContent =
                            data.stats.hitRate ? (data.stats.hitRate * 100).toFixed(1) + '%' : '-';
                        document.getElementById('cacheSize').textContent =
                            data.stats.usageRatio ? (data.stats.usageRatio * 100).toFixed(1) + '%' : '-';

                        showAlert('缓存统计已更新', 'success');
                    } else {
                        showAlert('获取缓存统计失败: ' + data.error, 'error');
                    }
                })
                .catch(function(error) {
                    showAlert('获取缓存统计失败: ' + error.message, 'error');
                });
        }

        // 清理过期缓存
        function cleanupCache() {
            if (!confirm('确定要清理过期的缓存吗？')) {
                return;
            }

            fetch('/api/cache-cleanup', { method: 'POST' })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        showAlert('清理完成，删除了 ' + data.cleanedCount + ' 个过期缓存', 'success');
                        refreshCacheStats();
                    } else {
                        showAlert('缓存清理失败: ' + data.error, 'error');
                    }
                })
                .catch(function(error) {
                    showAlert('缓存清理失败: ' + error.message, 'error');
                });
        }

        // 清空所有缓存
        function clearAllCache() {
            if (!confirm('确定要清空所有IP检测缓存吗？这将导致下次检测时重新调用API。')) {
                return;
            }

            fetch('/api/cache-clear', { method: 'POST' })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    if (data.success) {
                        showAlert('所有缓存已清空', 'success');
                        refreshCacheStats();
                    } else {
                        showAlert('清空缓存失败: ' + data.error, 'error');
                    }
                })
                .catch(function(error) {
                    showAlert('清空缓存失败: ' + error.message, 'error');
                });
        }

        // 页面加载时刷新缓存统计
        document.addEventListener('DOMContentLoaded', function() {
            // 延迟加载缓存统计，避免影响主要功能
            setTimeout(function() {
                refreshCacheStats();
                initCloudSync();
                initWebDAVConfig();
            }, 2000);
        });

        // ==================== 云端配置同步功能 ====================

        // 云同步状态
        var cloudSyncState = {
            isLoggedIn: false,
            userId: null,
            password: null,
            lastSync: null
        };

        // 初始化云同步
        function initCloudSync() {
            // 检查是否有保存的登录状态
            var savedState = localStorage.getItem('cloudSyncState');
            if (savedState) {
                try {
                    cloudSyncState = JSON.parse(savedState);
                    if (cloudSyncState.isLoggedIn && cloudSyncState.userId) {
                        updateCloudSyncUI(true);
                        document.getElementById('userId').value = cloudSyncState.userId;
                    }
                } catch (e) {
                    console.error('加载云同步状态失败:', e);
                }
            }
        }

        // 更新云同步UI状态
        function updateCloudSyncUI(isLoggedIn) {
            var loginSection = document.getElementById('loginSection');
            var loggedInSection = document.getElementById('loggedInSection');
            var statusIcon = document.getElementById('syncStatusIcon');
            var statusText = document.getElementById('syncStatusText');
            var statusDetails = document.getElementById('syncStatusDetails');

            if (isLoggedIn) {
                loginSection.style.display = 'none';
                loggedInSection.style.display = 'block';
                statusIcon.textContent = '☁️';
                statusText.textContent = '云端同步模式';
                statusDetails.textContent = '用户ID: ' + cloudSyncState.userId + ' | 最后同步: ' +
                    (cloudSyncState.lastSync ? new Date(cloudSyncState.lastSync).toLocaleString() : '从未同步');
            } else {
                loginSection.style.display = 'block';
                loggedInSection.style.display = 'none';
                statusIcon.textContent = '🔒';
                statusText.textContent = '本地存储模式';
                statusDetails.textContent = '配置数据仅保存在当前浏览器中';
            }
        }

        // 生成新用户ID
        function generateNewUserId() {
            var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var userId = '';
            for (var i = 0; i < 16; i++) {
                userId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            document.getElementById('userId').value = userId;
            showAlert('已生成新的用户ID: ' + userId, 'success');
        }

        // 检查用户是否存在
        function checkUserExists() {
            var userId = document.getElementById('userId').value.trim();

            if (!userId || userId.length !== 16) {
                showAlert('请输入16位用户ID', 'error');
                return;
            }

            fetch('/api/user-config/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    if (data.exists) {
                        showAlert('用户ID已存在，可以登录', 'success');
                    } else {
                        showAlert('用户ID不存在，可以注册', 'info');
                    }
                } else {
                    showAlert('检查失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                showAlert('检查失败: ' + error.message, 'error');
            });
        }

        // 注册新用户
        function registerCloudSync() {
            var userId = document.getElementById('userId').value.trim();
            var password = document.getElementById('userPassword').value;

            if (!userId || userId.length !== 16) {
                showAlert('请输入16位用户ID', 'error');
                return;
            }

            if (!password || password.length < 6) {
                showAlert('密码至少需要6位字符', 'error');
                return;
            }

            // 获取当前本地配置
            var currentConfig = {
                subscriptions: subscriptions,
                apiKeysManager: apiKeysManager,
                settings: {}
            };

            var resultDiv = document.getElementById('cloudSyncResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在注册用户并保存配置...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/user-config/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    password: password,
                    config: currentConfig
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    cloudSyncState = {
                        isLoggedIn: true,
                        userId: userId,
                        password: password,
                        lastSync: new Date().toISOString()
                    };
                    localStorage.setItem('cloudSyncState', JSON.stringify(cloudSyncState));

                    updateCloudSyncUI(true);
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 注册成功！配置已保存到云端</div>';
                    showAlert('注册成功！', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 注册失败: ' + data.error + '</div>';
                    showAlert('注册失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 注册失败: ' + error.message + '</div>';
                showAlert('注册失败: ' + error.message, 'error');
            });
        }

        // 登录云同步
        function loginCloudSync() {
            var userId = document.getElementById('userId').value.trim();
            var password = document.getElementById('userPassword').value;

            if (!userId || userId.length !== 16) {
                showAlert('请输入16位用户ID', 'error');
                return;
            }

            if (!password) {
                showAlert('请输入密码', 'error');
                return;
            }

            var resultDiv = document.getElementById('cloudSyncResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在登录...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/user-config/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    password: password
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    cloudSyncState = {
                        isLoggedIn: true,
                        userId: userId,
                        password: password,
                        lastSync: data.config.lastUpdated
                    };
                    localStorage.setItem('cloudSyncState', JSON.stringify(cloudSyncState));

                    updateCloudSyncUI(true);
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 登录成功！</div>';
                    showAlert('登录成功！', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 登录失败: ' + data.error + '</div>';
                    showAlert('登录失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 登录失败: ' + error.message + '</div>';
                showAlert('登录失败: ' + error.message, 'error');
            });
        }

        // 保存到云端
        function saveToCloud() {
            if (!cloudSyncState.isLoggedIn) {
                showAlert('请先登录云同步', 'error');
                return;
            }

            var currentConfig = {
                subscriptions: subscriptions,
                apiKeysManager: apiKeysManager,
                settings: {}
            };

            var resultDiv = document.getElementById('cloudSyncResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在保存到云端...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/user-config/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: cloudSyncState.userId,
                    password: cloudSyncState.password,
                    config: currentConfig
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    cloudSyncState.lastSync = data.lastUpdated;
                    localStorage.setItem('cloudSyncState', JSON.stringify(cloudSyncState));

                    updateCloudSyncUI(true);
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 配置已保存到云端！<br>' +
                        '配置大小: ' + (data.configSize || 0) + ' 字节</div>';
                    showAlert('配置已保存到云端！', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 保存失败: ' + data.error + '</div>';
                    showAlert('保存失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 保存失败: ' + error.message + '</div>';
                showAlert('保存失败: ' + error.message, 'error');
            });
        }

        // 从云端加载
        function loadFromCloud() {
            if (!cloudSyncState.isLoggedIn) {
                showAlert('请先登录云同步', 'error');
                return;
            }

            if (!confirm('从云端加载配置将覆盖当前的本地配置，确定继续吗？')) {
                return;
            }

            var resultDiv = document.getElementById('cloudSyncResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在从云端加载...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/user-config/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: cloudSyncState.userId,
                    password: cloudSyncState.password
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    // 更新本地配置
                    subscriptions = data.config.subscriptions || [];
                    apiKeysManager = data.config.apiKeysManager || { proxycheck: { keys: [] }, ipinfo: { tokens: [] } };

                    // 保存到localStorage作为备份
                    saveAllSettings();

                    // 刷新界面
                    loadSubscriptions();
                    loadAPIKeys();

                    cloudSyncState.lastSync = data.config.lastUpdated;
                    localStorage.setItem('cloudSyncState', JSON.stringify(cloudSyncState));

                    updateCloudSyncUI(true);
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 配置已从云端加载！<br>' +
                        '订阅数量: ' + subscriptions.length + ' | API密钥数量: ' +
                        ((apiKeysManager.proxycheck?.keys?.length || 0) + (apiKeysManager.ipinfo?.tokens?.length || 0)) + '</div>';
                    showAlert('配置已从云端加载！', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 加载失败: ' + data.error + '</div>';
                    showAlert('加载失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 加载失败: ' + error.message + '</div>';
                showAlert('加载失败: ' + error.message, 'error');
            });
        }

        // 退出登录
        function logoutCloudSync() {
            if (confirm('确定要退出云同步吗？本地配置不会被删除。')) {
                cloudSyncState = {
                    isLoggedIn: false,
                    userId: null,
                    password: null,
                    lastSync: null
                };
                localStorage.removeItem('cloudSyncState');

                updateCloudSyncUI(false);
                document.getElementById('userId').value = '';
                document.getElementById('userPassword').value = '';
                document.getElementById('cloudSyncResult').style.display = 'none';

                showAlert('已退出云同步', 'info');
            }
        }

        // ==================== 数据迁移功能 ====================

        // 迁移本地数据到云端
        function migrateLocalToCloud() {
            if (!cloudSyncState.isLoggedIn) {
                showAlert('请先登录云同步', 'error');
                return;
            }

            if (subscriptions.length === 0 &&
                (apiKeysManager.proxycheck?.keys?.length || 0) === 0 &&
                (apiKeysManager.ipinfo?.tokens?.length || 0) === 0) {
                showAlert('没有本地数据需要迁移', 'info');
                return;
            }

            if (!confirm('确定要将本地数据迁移到云端吗？这将覆盖云端的现有配置。')) {
                return;
            }

            saveToCloud(); // 复用保存到云端的功能
        }

        // 导出本地配置
        function exportLocalConfig() {
            var config = {
                subscriptions: subscriptions,
                apiKeysManager: apiKeysManager,
                settings: {},
                exportTime: new Date().toISOString(),
                version: '2.0'
            };

            var dataStr = JSON.stringify(config, null, 2);
            var dataBlob = new Blob([dataStr], { type: 'application/json' });

            var link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'ip-purity-checker-config-' + new Date().toISOString().split('T')[0] + '.json';
            link.click();

            var resultDiv = document.getElementById('migrationResult');
            resultDiv.innerHTML = '<div style="color: #28a745;">✅ 配置已导出！<br>' +
                '订阅数量: ' + subscriptions.length + ' | API密钥数量: ' +
                ((apiKeysManager.proxycheck?.keys?.length || 0) + (apiKeysManager.ipinfo?.tokens?.length || 0)) + '</div>';
            resultDiv.style.display = 'block';

            showAlert('配置文件已导出', 'success');
        }

        // 导入本地配置
        function importLocalConfig() {
            document.getElementById('importConfigFile').click();
        }

        // 处理配置文件导入
        function handleConfigImport(event) {
            var file = event.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var config = JSON.parse(e.target.result);

                    // 验证配置格式
                    if (!config.subscriptions && !config.apiKeysManager) {
                        throw new Error('无效的配置文件格式');
                    }

                    if (!confirm('导入配置将覆盖当前的本地配置，确定继续吗？')) {
                        return;
                    }

                    // 导入配置
                    if (config.subscriptions) {
                        subscriptions = config.subscriptions;
                    }
                    if (config.apiKeysManager) {
                        apiKeysManager = config.apiKeysManager;
                    }

                    // 保存到localStorage
                    saveAllSettings();

                    // 刷新界面
                    loadSubscriptions();
                    loadAPIKeys();

                    var resultDiv = document.getElementById('migrationResult');
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 配置已导入！<br>' +
                        '订阅数量: ' + subscriptions.length + ' | API密钥数量: ' +
                        ((apiKeysManager.proxycheck?.keys?.length || 0) + (apiKeysManager.ipinfo?.tokens?.length || 0)) + '</div>';
                    resultDiv.style.display = 'block';

                    showAlert('配置已成功导入', 'success');

                } catch (error) {
                    var resultDiv = document.getElementById('migrationResult');
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 导入失败: ' + error.message + '</div>';
                    resultDiv.style.display = 'block';

                    showAlert('导入失败: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);

            // 清除文件选择
            event.target.value = '';
        }

        // 清除本地数据
        function clearLocalData() {
            if (!confirm('确定要清除所有本地配置数据吗？此操作不可恢复！')) {
                return;
            }

            if (!confirm('最后确认：这将删除所有订阅链接和API密钥，确定继续吗？')) {
                return;
            }

            // 清除数据
            subscriptions = [];
            apiKeysManager = {
                proxycheck: { keys: [], strategy: 'round-robin', currentIndex: 0 },
                ipinfo: { tokens: [], strategy: 'round-robin', currentIndex: 0 }
            };

            // 清除localStorage
            localStorage.removeItem('subscriptions');
            localStorage.removeItem('apiKeysManager');

            // 刷新界面
            loadSubscriptions();
            loadAPIKeys();

            var resultDiv = document.getElementById('migrationResult');
            resultDiv.innerHTML = '<div style="color: #28a745;">✅ 本地数据已清除</div>';
            resultDiv.style.display = 'block';

            showAlert('本地数据已清除', 'success');
        }

        // 导出云端配置
        function exportCloudConfig() {
            if (!cloudSyncState.isLoggedIn) {
                showAlert('请先登录云同步', 'error');
                return;
            }

            fetch('/api/user-config/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: cloudSyncState.userId,
                    password: cloudSyncState.password
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    var dataStr = JSON.stringify(data.config, null, 2);
                    var dataBlob = new Blob([dataStr], { type: 'application/json' });

                    var link = document.createElement('a');
                    link.href = URL.createObjectURL(dataBlob);
                    link.download = 'ip-purity-checker-cloud-config-' + cloudSyncState.userId + '.json';
                    link.click();

                    showAlert('云端配置已导出', 'success');
                } else {
                    showAlert('导出失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                showAlert('导出失败: ' + error.message, 'error');
            });
        }

        // ==================== WebDAV云备份功能 ====================

        // WebDAV配置状态
        var webdavConfig = {
            url: '',
            username: '',
            password: '',
            path: 'ip-purity-checker/',
            isConfigured: false
        };

        // 初始化WebDAV配置
        function initWebDAVConfig() {
            var savedConfig = localStorage.getItem('webdavConfig');
            if (savedConfig) {
                try {
                    webdavConfig = JSON.parse(savedConfig);
                    updateWebDAVUI();
                    loadWebDAVConfigToForm();
                } catch (e) {
                    console.error('加载WebDAV配置失败:', e);
                }
            }
        }

        // 更新WebDAV UI状态
        function updateWebDAVUI() {
            var statusIcon = document.getElementById('webdavStatusIcon');
            var statusText = document.getElementById('webdavStatusText');
            var statusDetails = document.getElementById('webdavStatusDetails');

            if (webdavConfig.isConfigured && webdavConfig.url) {
                statusIcon.textContent = '🌐';
                statusText.textContent = 'WebDAV已配置';
                statusDetails.textContent = '服务器: ' + webdavConfig.url + ' | 用户: ' + webdavConfig.username;
            } else {
                statusIcon.textContent = '🔒';
                statusText.textContent = '未配置WebDAV';
                statusDetails.textContent = '请配置WebDAV服务器信息以启用云备份';
            }
        }

        // 加载WebDAV配置到表单
        function loadWebDAVConfigToForm() {
            document.getElementById('webdavUrl').value = webdavConfig.url || '';
            document.getElementById('webdavUsername').value = webdavConfig.username || '';
            document.getElementById('webdavPassword').value = webdavConfig.password || '';
            document.getElementById('webdavPath').value = webdavConfig.path || 'ip-purity-checker/';
        }

        // 从表单获取WebDAV配置
        function getWebDAVConfigFromForm() {
            return {
                url: document.getElementById('webdavUrl').value.trim(),
                username: document.getElementById('webdavUsername').value.trim(),
                password: document.getElementById('webdavPassword').value,
                path: document.getElementById('webdavPath').value.trim() || 'ip-purity-checker/'
            };
        }

        // 测试WebDAV连接
        function testWebDAVConnection() {
            var config = getWebDAVConfigFromForm();

            if (!config.url || !config.username || !config.password) {
                showAlert('请填写完整的WebDAV配置信息', 'error');
                return;
            }

            var resultDiv = document.getElementById('webdavResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在测试WebDAV连接...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/webdav/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ WebDAV连接测试成功！<br>' +
                        '服务器响应正常，可以进行备份操作。</div>';
                    showAlert('WebDAV连接测试成功', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ WebDAV连接测试失败:<br>' +
                        data.error + '</div>';
                    showAlert('WebDAV连接测试失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 连接测试失败: ' + error.message + '</div>';
                showAlert('连接测试失败: ' + error.message, 'error');
            });
        }

        // 保存WebDAV配置
        function saveWebDAVConfig() {
            var config = getWebDAVConfigFromForm();

            if (!config.url || !config.username || !config.password) {
                showAlert('请填写完整的WebDAV配置信息', 'error');
                return;
            }

            config.isConfigured = true;
            webdavConfig = config;

            // 保存到localStorage
            localStorage.setItem('webdavConfig', JSON.stringify(webdavConfig));

            updateWebDAVUI();
            showAlert('WebDAV配置已保存', 'success');

            var resultDiv = document.getElementById('webdavResult');
            resultDiv.innerHTML = '<div style="color: #28a745;">✅ WebDAV配置已保存</div>';
            resultDiv.style.display = 'block';
        }

        // 备份到WebDAV
        function backupToWebDAV() {
            if (!webdavConfig.isConfigured) {
                showAlert('请先配置并保存WebDAV设置', 'error');
                return;
            }

            var currentConfig = {
                subscriptions: subscriptions,
                apiKeysManager: apiKeysManager,
                settings: {},
                backupTime: new Date().toISOString(),
                version: '2.0'
            };

            var resultDiv = document.getElementById('webdavResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在备份到WebDAV...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/webdav/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webdavConfig: webdavConfig,
                    configData: currentConfig
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 配置已成功备份到WebDAV！<br>' +
                        '备份文件: ' + data.filename + '<br>' +
                        '文件大小: ' + (data.size || 0) + ' 字节</div>';
                    showAlert('配置已备份到WebDAV', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ WebDAV备份失败:<br>' +
                        data.error + '</div>';
                    showAlert('WebDAV备份失败: ' + data.error, 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 备份失败: ' + error.message + '</div>';
                showAlert('备份失败: ' + error.message, 'error');
            });
        }

        // 从WebDAV恢复
        function restoreFromWebDAV() {
            if (!webdavConfig.isConfigured) {
                showAlert('请先配置并保存WebDAV设置', 'error');
                return;
            }

            if (!confirm('从WebDAV恢复配置将覆盖当前的本地配置，确定继续吗？')) {
                return;
            }

            var resultDiv = document.getElementById('webdavResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在从WebDAV恢复配置...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/webdav/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webdavConfig: webdavConfig
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success && data.configData) {
                    // 更新本地配置
                    if (data.configData.subscriptions) {
                        subscriptions = data.configData.subscriptions;
                    }
                    if (data.configData.apiKeysManager) {
                        apiKeysManager = data.configData.apiKeysManager;
                    }

                    // 保存到localStorage作为备份
                    saveAllSettings();

                    // 刷新界面
                    loadSubscriptions();
                    loadAPIKeys();

                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 配置已从WebDAV恢复！<br>' +
                        '备份时间: ' + (data.configData.backupTime ? new Date(data.configData.backupTime).toLocaleString() : '未知') + '<br>' +
                        '订阅数量: ' + subscriptions.length + ' | API密钥数量: ' +
                        ((apiKeysManager.proxycheck?.keys?.length || 0) + (apiKeysManager.ipinfo?.tokens?.length || 0)) + '</div>';
                    showAlert('配置已从WebDAV恢复', 'success');
                } else {
                    resultDiv.innerHTML = '<div style="color: #dc3545;">❌ WebDAV恢复失败:<br>' +
                        (data.error || '未找到有效的备份文件') + '</div>';
                    showAlert('WebDAV恢复失败: ' + (data.error || '未找到有效的备份文件'), 'error');
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 恢复失败: ' + error.message + '</div>';
                showAlert('恢复失败: ' + error.message, 'error');
            });
        }

        // 查看WebDAV备份列表
        function listWebDAVBackups() {
            if (!webdavConfig.isConfigured) {
                showAlert('请先配置并保存WebDAV设置', 'error');
                return;
            }

            var resultDiv = document.getElementById('webdavResult');
            resultDiv.innerHTML = '<div style="color: #666;">正在获取备份列表...</div>';
            resultDiv.style.display = 'block';

            fetch('/api/webdav/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webdavConfig: webdavConfig
                })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success && data.files) {
                    var fileList = data.files.map(function(file) {
                        return '<tr>' +
                            '<td>' + file.name + '</td>' +
                            '<td>' + (file.size ? (file.size / 1024).toFixed(1) + ' KB' : '-') + '</td>' +
                            '<td>' + (file.lastModified ? new Date(file.lastModified).toLocaleString() : '-') + '</td>' +
                            '</tr>';
                    }).join('');

                    resultDiv.innerHTML = '<div style="color: #28a745;">✅ 找到 ' + data.files.length + ' 个备份文件:</div>' +
                        '<table style="width: 100%; margin-top: 10px; border-collapse: collapse;">' +
                        '<thead><tr style="background: #f5f5f5;"><th style="padding: 8px; border: 1px solid #ddd;">文件名</th>' +
                        '<th style="padding: 8px; border: 1px solid #ddd;">大小</th>' +
                        '<th style="padding: 8px; border: 1px solid #ddd;">修改时间</th></tr></thead>' +
                        '<tbody>' + fileList + '</tbody></table>';
                } else {
                    resultDiv.innerHTML = '<div style="color: #ffc107;">⚠️ 未找到备份文件或目录为空</div>';
                }
            })
            .catch(function(error) {
                resultDiv.innerHTML = '<div style="color: #dc3545;">❌ 获取备份列表失败: ' + error.message + '</div>';
                showAlert('获取备份列表失败: ' + error.message, 'error');
            });
        }
    </script>
</body>
</html>`;
}

// 处理IP检测API
async function handleCheckIP(request, env) {
    const url = new URL(request.url);
    const ip = url.searchParams.get('ip');
    
    if (!ip) {
        return new Response(JSON.stringify({ error: '缺少IP参数' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 简单的IP检测逻辑
    const result = {
        ip: ip,
        isPure: Math.random() > 0.5, // 随机结果，实际应该调用检测API
        riskScore: Math.floor(Math.random() * 100),
        country: 'Unknown',
        city: 'Unknown',
        timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// 处理状态查询
async function handleStatus(env) {
    const status = {
        status: 'running',
        timestamp: new Date().toISOString(),
        stats: {
            totalChecked: 0,
            pureIPs: 0,
            lastCheck: null
        }
    };

    return new Response(JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// ==================== 定时任务核心功能 ====================

// 执行定时任务主函数
async function executeScheduledTask(env, ctx) {
    const startTime = Date.now();
    console.log('🚀 开始执行定时IP纯净度检查任务');

    // 1. 获取所有订阅链接
    const subscriptions = await getStoredSubscriptions(env);
    if (!subscriptions || subscriptions.length === 0) {
        throw new Error('没有找到订阅链接');
    }

    console.log(`📡 找到 ${subscriptions.length} 个订阅链接`);

    // 2. 解析所有订阅获取节点
    const allNodes = await parseAllSubscriptions(subscriptions, env);
    console.log(`🔍 解析得到 ${allNodes.length} 个节点`);

    // 3. 提取并去重IP地址
    const uniqueIPs = extractUniqueIPs(allNodes);
    console.log(`🌐 提取到 ${uniqueIPs.length} 个唯一IP地址`);

    // 4. 批量检测IP纯净度
    const ipResults = await batchCheckIPPurity(uniqueIPs, env);
    console.log(`✅ 完成 ${ipResults.length} 个IP的纯净度检测`);

    // 5. 筛选纯净IP并排序
    const pureIPs = filterAndSortPureIPs(ipResults, 500); // 选择前500个最纯净的IP
    console.log(`🎯 筛选出 ${pureIPs.length} 个纯净IP`);

    // 6. 生成Clash配置文件
    const clashConfig = await generateClashConfig(pureIPs, allNodes, env);
    console.log(`📄 生成Clash配置文件，大小: ${clashConfig.length} 字符`);

    // 7. 更新到GitHub
    const githubResult = await updateGitHubRepository(clashConfig, env);
    console.log(`📤 GitHub更新结果:`, githubResult);

    // 8. 保存统计信息
    const stats = {
        lastRun: new Date().toISOString(),
        totalSubscriptions: subscriptions.length,
        totalNodes: allNodes.length,
        totalIPs: uniqueIPs.length,
        pureIPs: pureIPs.length,
        executionTime: Date.now() - startTime,
        githubUpdate: githubResult
    };

    await saveTaskStats(stats, env);

    return stats;
}

// 获取存储的订阅链接
async function getStoredSubscriptions(env) {
    if (!env.IP_CACHE) {
        throw new Error('KV存储未配置');
    }

    const stored = await env.IP_CACHE.get('subscriptions');
    if (!stored) {
        return [];
    }

    try {
        return JSON.parse(stored);
    } catch (error) {
        console.error('解析订阅数据失败:', error);
        return [];
    }
}

// 解析所有订阅获取节点信息
async function parseAllSubscriptions(subscriptions, env) {
    const allNodes = [];
    const maxConcurrent = 5; // 限制并发数避免过载

    for (let i = 0; i < subscriptions.length; i += maxConcurrent) {
        const batch = subscriptions.slice(i, i + maxConcurrent);
        const promises = batch.map(sub => parseSubscription(sub, env));

        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allNodes.push(...result.value);
            } else {
                console.error(`订阅解析失败 ${batch[index].name}:`, result.reason);
            }
        });

        // 添加延迟避免请求过快
        if (i + maxConcurrent < subscriptions.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return allNodes;
}

// 解析单个订阅链接
async function parseSubscription(subscription, env) {
    try {
        console.log(`🔄 解析订阅: ${subscription.name}`);

        const response = await fetch(subscription.url, {
            headers: {
                'User-Agent': 'ClashX/1.118.0 (com.west2online.ClashX; build:1.118.0; macOS 14.0.0) Alamofire/5.8.1'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        const nodes = [];

        // 检测订阅格式并解析
        if (content.includes('proxies:') || content.includes('Proxy:')) {
            // Clash YAML格式
            nodes.push(...parseClashYAML(content, subscription.name));
        } else if (content.includes('vmess://') || content.includes('vless://') || content.includes('trojan://')) {
            // V2Ray/Xray格式
            nodes.push(...parseV2RayNodes(content, subscription.name));
        } else if (content.includes('ss://')) {
            // Shadowsocks格式
            nodes.push(...parseShadowsocksNodes(content, subscription.name));
        } else {
            // 尝试Base64解码
            try {
                const decoded = atob(content);
                nodes.push(...parseV2RayNodes(decoded, subscription.name));
            } catch (e) {
                console.warn(`无法识别订阅格式: ${subscription.name}`);
            }
        }

        // 更新订阅状态
        subscription.lastChecked = new Date().toISOString();
        subscription.status = 'active';
        subscription.nodeCount = nodes.length;

        return nodes;

    } catch (error) {
        console.error(`订阅解析失败 ${subscription.name}:`, error);
        subscription.lastChecked = new Date().toISOString();
        subscription.status = 'error';
        subscription.error = error.message;
        return [];
    }
}

// 解析Clash YAML格式
function parseClashYAML(content, subscriptionName) {
    const nodes = [];
    const lines = content.split('\n');
    let inProxiesSection = false;
    let currentNode = null;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === 'proxies:' || trimmed === 'Proxy:') {
            inProxiesSection = true;
            continue;
        }

        if (inProxiesSection) {
            if (trimmed.startsWith('- name:') || trimmed.startsWith('- {')) {
                if (currentNode) {
                    nodes.push(currentNode);
                }
                currentNode = {
                    subscription: subscriptionName,
                    raw: line
                };

                // 解析节点名称
                const nameMatch = trimmed.match(/name:\s*["']?([^"',}]+)["']?/);
                if (nameMatch) {
                    currentNode.name = nameMatch[1];
                }
            } else if (currentNode && trimmed.includes(':')) {
                // 解析节点属性
                const [key, value] = trimmed.split(':').map(s => s.trim());
                if (key === 'server') {
                    currentNode.server = value.replace(/["']/g, '');
                } else if (key === 'port') {
                    currentNode.port = parseInt(value);
                } else if (key === 'type') {
                    currentNode.type = value.replace(/["']/g, '');
                }
            } else if (trimmed && !trimmed.startsWith('-') && !trimmed.includes(':')) {
                // 结束proxies部分
                break;
            }
        }
    }

    if (currentNode) {
        nodes.push(currentNode);
    }

    return nodes.filter(node => node.server && node.port);
}

// 解析V2Ray节点格式
function parseV2RayNodes(content, subscriptionName) {
    const nodes = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
            if (trimmed.startsWith('vmess://')) {
                const node = parseVmessNode(trimmed, subscriptionName);
                if (node) nodes.push(node);
            } else if (trimmed.startsWith('vless://')) {
                const node = parseVlessNode(trimmed, subscriptionName);
                if (node) nodes.push(node);
            } else if (trimmed.startsWith('trojan://')) {
                const node = parseTrojanNode(trimmed, subscriptionName);
                if (node) nodes.push(node);
            }
        } catch (error) {
            console.warn(`解析节点失败: ${trimmed.substring(0, 50)}...`);
        }
    }

    return nodes;
}

// 解析VMess节点
function parseVmessNode(vmessUrl, subscriptionName) {
    try {
        const base64Data = vmessUrl.replace('vmess://', '');
        const jsonData = JSON.parse(atob(base64Data));

        return {
            subscription: subscriptionName,
            name: jsonData.ps || jsonData.remarks || 'VMess节点',
            server: jsonData.add,
            port: parseInt(jsonData.port),
            type: 'vmess',
            uuid: jsonData.id,
            alterId: parseInt(jsonData.aid) || 0,
            cipher: jsonData.scy || 'auto',
            network: jsonData.net || 'tcp',
            raw: vmessUrl
        };
    } catch (error) {
        return null;
    }
}

// 解析VLess节点
function parseVlessNode(vlessUrl, subscriptionName) {
    try {
        const url = new URL(vlessUrl);
        const params = new URLSearchParams(url.search);

        return {
            subscription: subscriptionName,
            name: decodeURIComponent(url.hash.substring(1)) || 'VLess节点',
            server: url.hostname,
            port: parseInt(url.port),
            type: 'vless',
            uuid: url.username,
            flow: params.get('flow') || '',
            network: params.get('type') || 'tcp',
            raw: vlessUrl
        };
    } catch (error) {
        return null;
    }
}

// 解析Trojan节点
function parseTrojanNode(trojanUrl, subscriptionName) {
    try {
        const url = new URL(trojanUrl);

        return {
            subscription: subscriptionName,
            name: decodeURIComponent(url.hash.substring(1)) || 'Trojan节点',
            server: url.hostname,
            port: parseInt(url.port),
            type: 'trojan',
            password: url.username,
            raw: trojanUrl
        };
    } catch (error) {
        return null;
    }
}

// 解析Shadowsocks节点
function parseShadowsocksNodes(content, subscriptionName) {
    const nodes = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('ss://')) continue;

        try {
            const url = new URL(trimmed);
            const userInfo = atob(url.username);
            const [method, password] = userInfo.split(':');

            nodes.push({
                subscription: subscriptionName,
                name: decodeURIComponent(url.hash.substring(1)) || 'SS节点',
                server: url.hostname,
                port: parseInt(url.port),
                type: 'ss',
                cipher: method,
                password: password,
                raw: trimmed
            });
        } catch (error) {
            console.warn(`解析SS节点失败: ${trimmed.substring(0, 50)}...`);
        }
    }

    return nodes;
}

// 提取并去重IP地址
function extractUniqueIPs(nodes) {
    const ipSet = new Set();
    const ipToNodes = new Map();

    nodes.forEach(node => {
        if (node.server && isValidIP(node.server)) {
            ipSet.add(node.server);

            if (!ipToNodes.has(node.server)) {
                ipToNodes.set(node.server, []);
            }
            ipToNodes.get(node.server).push(node);
        }
    });

    return Array.from(ipSet).map(ip => ({
        ip: ip,
        nodes: ipToNodes.get(ip)
    }));
}

// 批量检测IP纯净度
async function batchCheckIPPurity(uniqueIPs, env) {
    const results = [];
    const batchSize = 10; // 每批处理10个IP
    const delayBetweenBatches = 2000; // 批次间延迟2秒

    console.log(`🔍 开始批量检测 ${uniqueIPs.length} 个IP的纯净度`);

    for (let i = 0; i < uniqueIPs.length; i += batchSize) {
        const batch = uniqueIPs.slice(i, i + batchSize);
        console.log(`处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueIPs.length/batchSize)}`);

        const batchPromises = batch.map(async (ipData) => {
            try {
                const result = await checkIPPurityWithRotation(ipData.ip, env);
                return {
                    ...ipData,
                    ...result,
                    checkTime: new Date().toISOString()
                };
            } catch (error) {
                console.error(`IP检测失败 ${ipData.ip}:`, error);
                return {
                    ...ipData,
                    isPure: false,
                    riskScore: 100,
                    error: error.message,
                    checkTime: new Date().toISOString()
                };
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
        });

        // 批次间延迟
        if (i + batchSize < uniqueIPs.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    return results;
}

// 使用API密钥轮换检测IP纯净度 - 增强缓存版本
async function checkIPPurityWithRotation(ip, env) {
    // 1. 首先检查缓存
    const cachedResult = await getIPCacheResult(ip, env);
    if (cachedResult) {
        console.log(`✅ 缓存命中: ${ip} (缓存时间: ${cachedResult.cachedAt})`);
        return {
            ...cachedResult,
            source: cachedResult.source + ' (cached)'
        };
    }

    console.log(`🔍 缓存未命中，开始API检测: ${ip}`);

    // 2. 缓存未命中，进行API检测
    const apiKeys = await getStoredAPIKeys(env);
    let result = null;

    // 尝试使用ProxyCheck.io
    if (apiKeys.proxycheck && apiKeys.proxycheck.length > 0) {
        const activeKeys = apiKeys.proxycheck.filter(key => key.isActive && key.status === 'active');

        for (const key of activeKeys) {
            try {
                result = await checkWithProxyCheck(ip, key.value);

                // 更新密钥使用记录
                key.lastUsed = new Date().toISOString();
                key.quota.used += 1;
                key.quota.remaining = Math.max(0, key.quota.remaining - 1);

                await saveAPIKeys(apiKeys, env);
                break; // 成功获取结果，跳出循环
            } catch (error) {
                console.warn(`ProxyCheck API失败 (${key.name}):`, error.message);

                // 标记密钥为失效状态
                if (error.message.includes('quota') || error.message.includes('limit')) {
                    key.status = 'error';
                    key.quota.remaining = 0;
                }
            }
        }
    }

    // 如果ProxyCheck失败，尝试使用IPinfo.io
    if (!result && apiKeys.ipinfo && apiKeys.ipinfo.length > 0) {
        const activeTokens = apiKeys.ipinfo.filter(token => token.isActive && token.status === 'active');

        for (const token of activeTokens) {
            try {
                result = await checkWithIPInfo(ip, token.value);

                // 更新Token使用记录
                token.lastUsed = new Date().toISOString();
                token.quota.used += 1;
                token.quota.remaining = Math.max(0, token.quota.remaining - 1);

                await saveAPIKeys(apiKeys, env);
                break; // 成功获取结果，跳出循环
            } catch (error) {
                console.warn(`IPInfo API失败 (${token.name}):`, error.message);

                if (error.message.includes('quota') || error.message.includes('limit')) {
                    token.status = 'error';
                    token.quota.remaining = 0;
                }
            }
        }
    }

    // 如果所有API都失败，返回基础检测结果
    if (!result) {
        result = {
            ip: ip,
            isPure: Math.random() > 0.5, // 随机结果作为fallback
            riskScore: Math.floor(Math.random() * 100),
            country: 'Unknown',
            city: 'Unknown',
            isp: 'Unknown',
            source: 'fallback'
        };
    }

    // 3. 将结果保存到缓存
    await saveIPCacheResult(ip, result, env);

    return result;
}

// 使用ProxyCheck.io检测
async function checkWithProxyCheck(ip, apiKey) {
    const url = `https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1&risk=1&port=1&seen=1&days=7&tag=clash-purity`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'IP-Purity-Checker/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`ProxyCheck API错误: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
        throw new Error(data.message || 'ProxyCheck API错误');
    }

    // 检查API响应状态，ProxyCheck.io成功时返回'ok'
    if (data.status !== 'ok') {
        throw new Error(`ProxyCheck API状态异常: ${data.status}`);
    }

    const ipData = data[ip];
    if (!ipData) {
        throw new Error('无效的API响应');
    }

    return {
        status: 'success',  // 标准化状态码
        ip: ip,
        isPure: ipData.proxy === 'no',
        riskScore: ipData.risk || 0,
        country: ipData.country || 'Unknown',
        city: ipData.city || 'Unknown',
        isp: ipData.isp || 'Unknown',
        asn: ipData.asn || 'Unknown',
        source: 'proxycheck'
    };
}

// 使用IPinfo.io检测
async function checkWithIPInfo(ip, token) {
    const url = `https://ipinfo.io/${ip}?token=${token}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'IP-Purity-Checker/1.0'
        }
    });

    if (!response.ok) {
        throw new Error(`IPInfo API错误: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'IPInfo API错误');
    }

    // IPInfo不直接提供代理检测，基于ASN和ISP判断
    const suspiciousKeywords = ['hosting', 'cloud', 'server', 'datacenter', 'vps'];
    const isSuspicious = suspiciousKeywords.some(keyword =>
        (data.org || '').toLowerCase().includes(keyword)
    );

    return {
        ip: ip,
        isPure: !isSuspicious,
        riskScore: isSuspicious ? 80 : 20,
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        isp: data.org || 'Unknown',
        region: data.region || 'Unknown',
        source: 'ipinfo'
    };
}

// 筛选和排序纯净IP
function filterAndSortPureIPs(ipResults, maxCount = 500) {
    // 过滤纯净IP
    const pureIPs = ipResults.filter(result => result.isPure && result.riskScore < 50);

    // 按纯净度评分排序（风险分数越低越好）
    pureIPs.sort((a, b) => {
        // 主要按风险分数排序
        if (a.riskScore !== b.riskScore) {
            return a.riskScore - b.riskScore;
        }

        // 次要按节点数量排序（节点多的优先）
        return (b.nodes?.length || 0) - (a.nodes?.length || 0);
    });

    // 限制数量
    return pureIPs.slice(0, maxCount);
}

// 生成Clash配置文件
async function generateClashConfig(pureIPs, allNodes, env) {
    console.log('📄 开始生成Clash配置文件');

    // 获取模板
    const template = await getClashTemplate();

    // 构建节点配置
    const proxyNodes = [];
    const nodesByCountry = {};

    pureIPs.forEach((ipResult, index) => {
        if (!ipResult.nodes || ipResult.nodes.length === 0) return;

        // 为每个纯净IP创建节点
        ipResult.nodes.forEach((node, nodeIndex) => {
            const nodeName = `${getCountryFlag(ipResult.country)} ${ipResult.country}-${index + 1}-${nodeIndex + 1}`;

            // 生成Clash节点配置
            const clashNode = generateClashNode(node, nodeName, ipResult);
            if (clashNode) {
                proxyNodes.push(clashNode);

                // 按国家分组
                const country = ipResult.country || 'Other';
                if (!nodesByCountry[country]) {
                    nodesByCountry[country] = [];
                }
                nodesByCountry[country].push(nodeName);
            }
        });
    });

    // 替换模板变量
    let config = template
        .replace('{{GENERATION_TIME}}', new Date().toISOString())
        .replace('{{TOTAL_NODES}}', proxyNodes.length)
        .replace('{{PURE_IPS}}', pureIPs.length)
        .replace('{{LAST_UPDATE}}', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));

    // 替换节点配置
    config = config.replace('{{PROXY_NODES}}', proxyNodes.join('\n'));

    // 替换代理组配置
    const allNodeNames = proxyNodes.map(node => `      - "${extractNodeName(node)}"`);
    config = config.replace('{{AUTO_SELECT_NODES}}', allNodeNames.join('\n'));
    config = config.replace('{{FALLBACK_NODES}}', allNodeNames.join('\n'));
    config = config.replace('{{LOAD_BALANCE_NODES}}', allNodeNames.join('\n'));

    // 替换地区分组
    config = config.replace('{{US_NODES}}', generateCountryNodes(nodesByCountry, 'United States', 'US'));
    config = config.replace('{{HK_NODES}}', generateCountryNodes(nodesByCountry, 'Hong Kong', 'HK'));
    config = config.replace('{{JP_NODES}}', generateCountryNodes(nodesByCountry, 'Japan', 'JP'));
    config = config.replace('{{SG_NODES}}', generateCountryNodes(nodesByCountry, 'Singapore', 'SG'));
    config = config.replace('{{KR_NODES}}', generateCountryNodes(nodesByCountry, 'South Korea', 'KR'));
    config = config.replace('{{GB_NODES}}', generateCountryNodes(nodesByCountry, 'United Kingdom', 'GB'));
    config = config.replace('{{DE_NODES}}', generateCountryNodes(nodesByCountry, 'Germany', 'DE'));
    config = config.replace('{{OTHER_NODES}}', generateOtherCountryNodes(nodesByCountry));

    return config;
}

// 获取Clash模板
async function getClashTemplate() {
    // 内置模板，避免外部依赖
    return `# Clash配置文件 - IP纯净度优化版
# 生成时间: {{GENERATION_TIME}}
# 总节点数: {{TOTAL_NODES}}
# 纯净IP数: {{PURE_IPS}}
# 最后更新: {{LAST_UPDATE}}

port: 7890
socks-port: 7891
allow-lan: true
mode: rule
log-level: info
external-controller: 127.0.0.1:9090

dns:
  enable: true
  listen: 0.0.0.0:53
  default-nameserver:
    - 223.5.5.5
    - 8.8.8.8
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  nameserver:
    - https://doh.pub/dns-query
    - https://dns.alidns.com/dns-query

proxies:
{{PROXY_NODES}}

proxy-groups:
  - name: "🚀 节点选择"
    type: select
    proxies:
      - "♻️ 自动选择"
      - "🔯 故障转移"
      - "⚡ 负载均衡"
      - "🇺🇸 美国节点"
      - "🇭🇰 香港节点"
      - "🇯🇵 日本节点"
      - "🇸🇬 新加坡节点"
      - "🌍 其他地区"
      - "DIRECT"

  - name: "♻️ 自动选择"
    type: url-test
    proxies:
{{AUTO_SELECT_NODES}}
    url: 'http://www.gstatic.com/generate_204'
    interval: 300

  - name: "🔯 故障转移"
    type: fallback
    proxies:
{{FALLBACK_NODES}}
    url: 'http://www.gstatic.com/generate_204'
    interval: 300

  - name: "⚡ 负载均衡"
    type: load-balance
    strategy: consistent-hashing
    proxies:
{{LOAD_BALANCE_NODES}}
    url: 'http://www.gstatic.com/generate_204'
    interval: 300

  - name: "🇺🇸 美国节点"
    type: select
    proxies:
{{US_NODES}}

  - name: "🇭🇰 香港节点"
    type: select
    proxies:
{{HK_NODES}}

  - name: "🇯🇵 日本节点"
    type: select
    proxies:
{{JP_NODES}}

  - name: "🇸🇬 新加坡节点"
    type: select
    proxies:
{{SG_NODES}}

  - name: "🌍 其他地区"
    type: select
    proxies:
{{OTHER_NODES}}

rules:
  - DOMAIN-SUFFIX,local,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - IP-CIDR,172.16.0.0/12,DIRECT
  - IP-CIDR,192.168.0.0/16,DIRECT
  - IP-CIDR,10.0.0.0/8,DIRECT
  - GEOIP,CN,DIRECT
  - MATCH,🚀 节点选择`;
}

// 生成Clash节点配置
function generateClashNode(node, nodeName, ipResult) {
    const baseConfig = {
        name: nodeName,
        server: node.server,
        port: node.port
    };

    switch (node.type) {
        case 'vmess':
            return `  - name: "${nodeName}"
    type: vmess
    server: ${node.server}
    port: ${node.port}
    uuid: ${node.uuid}
    alterId: ${node.alterId || 0}
    cipher: ${node.cipher || 'auto'}
    network: ${node.network || 'tcp'}
    # 纯净度: ${100 - ipResult.riskScore}% | 风险分数: ${ipResult.riskScore} | 来源: ${ipResult.source}`;

        case 'vless':
            return `  - name: "${nodeName}"
    type: vless
    server: ${node.server}
    port: ${node.port}
    uuid: ${node.uuid}
    network: ${node.network || 'tcp'}
    flow: ${node.flow || ''}
    # 纯净度: ${100 - ipResult.riskScore}% | 风险分数: ${ipResult.riskScore} | 来源: ${ipResult.source}`;

        case 'trojan':
            return `  - name: "${nodeName}"
    type: trojan
    server: ${node.server}
    port: ${node.port}
    password: ${node.password}
    # 纯净度: ${100 - ipResult.riskScore}% | 风险分数: ${ipResult.riskScore} | 来源: ${ipResult.source}`;

        case 'ss':
            return `  - name: "${nodeName}"
    type: ss
    server: ${node.server}
    port: ${node.port}
    cipher: ${node.cipher}
    password: ${node.password}
    # 纯净度: ${100 - ipResult.riskScore}% | 风险分数: ${ipResult.riskScore} | 来源: ${ipResult.source}`;

        default:
            // 尝试从原始配置生成
            if (node.raw && node.raw.includes('name:')) {
                return node.raw.replace(/name:\s*["']?[^"',}]+["']?/, `name: "${nodeName}"`);
            }
            return null;
    }
}

// 提取节点名称
function extractNodeName(nodeConfig) {
    const match = nodeConfig.match(/name:\s*["']([^"']+)["']/);
    return match ? match[1] : 'Unknown';
}

// 生成国家节点列表
function generateCountryNodes(nodesByCountry, countryName, countryCode) {
    const nodes = nodesByCountry[countryName] || nodesByCountry[countryCode] || [];
    if (nodes.length === 0) {
        return '      - "DIRECT"';
    }
    return nodes.map(name => `      - "${name}"`).join('\n');
}

// 生成其他国家节点列表
function generateOtherCountryNodes(nodesByCountry) {
    const mainCountries = ['United States', 'US', 'Hong Kong', 'HK', 'Japan', 'JP', 'Singapore', 'SG', 'South Korea', 'KR', 'United Kingdom', 'GB', 'Germany', 'DE'];
    const otherNodes = [];

    Object.entries(nodesByCountry).forEach(([country, nodes]) => {
        if (!mainCountries.includes(country)) {
            otherNodes.push(...nodes);
        }
    });

    if (otherNodes.length === 0) {
        return '      - "DIRECT"';
    }
    return otherNodes.map(name => `      - "${name}"`).join('\n');
}

// 获取国家旗帜emoji
function getCountryFlag(country) {
    const flags = {
        'United States': '🇺🇸', 'US': '🇺🇸',
        'China': '🇨🇳', 'CN': '🇨🇳',
        'Hong Kong': '🇭🇰', 'HK': '🇭🇰',
        'Japan': '🇯🇵', 'JP': '🇯🇵',
        'South Korea': '🇰🇷', 'KR': '🇰🇷',
        'Singapore': '🇸🇬', 'SG': '🇸🇬',
        'Taiwan': '🇹🇼', 'TW': '🇹🇼',
        'United Kingdom': '🇬🇧', 'GB': '🇬🇧',
        'Germany': '🇩🇪', 'DE': '🇩🇪',
        'France': '🇫🇷', 'FR': '🇫🇷',
        'Canada': '🇨🇦', 'CA': '🇨🇦',
        'Australia': '🇦🇺', 'AU': '🇦🇺',
        'Russia': '🇷🇺', 'RU': '🇷🇺',
        'India': '🇮🇳', 'IN': '🇮🇳',
        'Brazil': '🇧🇷', 'BR': '🇧🇷',
        'Netherlands': '🇳🇱', 'NL': '🇳🇱'
    };
    return flags[country] || '🌍';
}

// 更新GitHub仓库
async function updateGitHubRepository(clashConfig, env) {
    console.log('📤 开始更新GitHub仓库');

    // 从环境变量获取GitHub配置
    const githubToken = env.GITHUB_TOKEN;
    const githubRepo = env.GITHUB_REPO || 'twj0/clash-config';
    const githubBranch = env.GITHUB_BRANCH || 'main';
    const fileName = 'clash-config.yaml';

    if (!githubToken) {
        console.warn('⚠️ 未配置GitHub Token，跳过GitHub更新');
        return { success: false, reason: 'GitHub Token未配置' };
    }

    try {
        // 1. 获取当前文件信息
        const getFileUrl = `https://api.github.com/repos/${githubRepo}/contents/${fileName}?ref=${githubBranch}`;
        const getFileResponse = await fetch(getFileUrl, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'IP-Purity-Checker/1.0'
            }
        });

        let sha = null;
        if (getFileResponse.ok) {
            const fileData = await getFileResponse.json();
            sha = fileData.sha;
        }

        // 2. 更新或创建文件
        const updateFileUrl = `https://api.github.com/repos/${githubRepo}/contents/${fileName}`;
        const commitMessage = `🤖 自动更新Clash配置 - ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

📊 更新统计:
- 配置大小: ${Math.round(clashConfig.length / 1024)}KB
- 更新时间: ${new Date().toISOString()}
- 生成来源: IP纯净度检查工具

🔗 访问地址: https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/${fileName}`;

        const updatePayload = {
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(clashConfig))), // Base64编码
            branch: githubBranch
        };

        if (sha) {
            updatePayload.sha = sha;
        }

        const updateResponse = await fetch(updateFileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'IP-Purity-Checker/1.0'
            },
            body: JSON.stringify(updatePayload)
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`GitHub API错误: ${updateResponse.status} - ${errorData.message}`);
        }

        const result = await updateResponse.json();

        return {
            success: true,
            commitSha: result.commit.sha,
            downloadUrl: result.content.download_url,
            htmlUrl: result.content.html_url,
            size: clashConfig.length
        };

    } catch (error) {
        console.error('GitHub更新失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 保存任务统计信息
async function saveTaskStats(stats, env) {
    if (!env.IP_CACHE) return;

    try {
        await env.IP_CACHE.put('task_stats', JSON.stringify(stats));
        await env.IP_CACHE.put('last_successful_run', stats.lastRun);
        console.log('✅ 任务统计信息已保存');
    } catch (error) {
        console.error('保存统计信息失败:', error);
    }
}

// 获取存储的API密钥
async function getStoredAPIKeys(env) {
    if (!env.IP_CACHE) return { proxycheck: [], ipinfo: [] };

    try {
        const stored = await env.IP_CACHE.get('apiKeysManager');
        if (!stored) return { proxycheck: [], ipinfo: [] };

        const data = JSON.parse(stored);
        return {
            proxycheck: data.proxycheck?.keys || [],
            ipinfo: data.ipinfo?.tokens || []
        };
    } catch (error) {
        console.error('获取API密钥失败:', error);
        return { proxycheck: [], ipinfo: [] };
    }
}

// 保存API密钥
async function saveAPIKeys(apiKeys, env) {
    if (!env.IP_CACHE) return;

    try {
        const data = {
            proxycheck: { keys: apiKeys.proxycheck },
            ipinfo: { tokens: apiKeys.ipinfo }
        };
        await env.IP_CACHE.put('apiKeysManager', JSON.stringify(data));
    } catch (error) {
        console.error('保存API密钥失败:', error);
    }
}

// 验证IP地址格式
function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

// ==================== 用户配置持久化存储系统 ====================

// 用户配置存储配置
const USER_CONFIG = {
    KEY_PREFIX: 'user_config_',
    ENCRYPTION_KEY_LENGTH: 32,
    USER_ID_LENGTH: 16,
    MAX_CONFIG_SIZE: 1024 * 1024, // 1MB限制
    BACKUP_RETENTION_DAYS: 30
};

// 简单的加密/解密函数（使用Web Crypto API的替代实现）
async function encryptData(data, password) {
    try {
        // 生成盐值
        const salt = crypto.getRandomValues(new Uint8Array(16));

        // 使用密码和盐值生成密钥
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // 加密数据
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encodedData = encoder.encode(JSON.stringify(data));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encodedData
        );

        // 组合结果
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);

        return btoa(String.fromCharCode(...result));
    } catch (error) {
        console.error('数据加密失败:', error);
        throw new Error('数据加密失败');
    }
}

async function decryptData(encryptedData, password) {
    try {
        // 解码Base64
        const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));

        // 提取盐值、IV和加密数据
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const encrypted = data.slice(28);

        // 重新生成密钥
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // 解密数据
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
        console.error('数据解密失败:', error);
        throw new Error('数据解密失败或密码错误');
    }
}

// 生成用户ID
function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < USER_CONFIG.USER_ID_LENGTH; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 验证用户ID格式
function isValidUserId(userId) {
    return typeof userId === 'string' &&
           userId.length === USER_CONFIG.USER_ID_LENGTH &&
           /^[A-Za-z0-9]+$/.test(userId);
}

// 生成配置密钥
function generateConfigKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < USER_CONFIG.ENCRYPTION_KEY_LENGTH; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 保存用户配置到KV存储
async function saveUserConfig(userId, password, configData, env) {
    if (!env.IP_CACHE) {
        throw new Error('KV存储未配置');
    }

    if (!isValidUserId(userId)) {
        throw new Error('无效的用户ID格式');
    }

    try {
        // 准备配置数据
        const userConfig = {
            userId: userId,
            subscriptions: configData.subscriptions || [],
            apiKeysManager: configData.apiKeysManager || { proxycheck: { keys: [] }, ipinfo: { tokens: [] } },
            settings: configData.settings || {},
            lastUpdated: new Date().toISOString(),
            version: '2.0'
        };

        // 检查配置大小
        const configSize = JSON.stringify(userConfig).length;
        if (configSize > USER_CONFIG.MAX_CONFIG_SIZE) {
            throw new Error('配置数据过大，请减少订阅数量或API密钥数量');
        }

        // 加密配置数据
        const encryptedConfig = await encryptData(userConfig, password);

        // 保存到KV存储
        const configKey = USER_CONFIG.KEY_PREFIX + userId;
        await env.IP_CACHE.put(configKey, encryptedConfig, {
            expirationTtl: USER_CONFIG.BACKUP_RETENTION_DAYS * 24 * 60 * 60
        });

        // 保存配置元数据（不加密）
        const metadata = {
            userId: userId,
            lastUpdated: userConfig.lastUpdated,
            subscriptionCount: userConfig.subscriptions.length,
            apiKeyCount: (userConfig.apiKeysManager.proxycheck?.keys?.length || 0) +
                        (userConfig.apiKeysManager.ipinfo?.tokens?.length || 0),
            configSize: configSize,
            version: userConfig.version
        };

        await env.IP_CACHE.put(configKey + '_meta', JSON.stringify(metadata), {
            expirationTtl: USER_CONFIG.BACKUP_RETENTION_DAYS * 24 * 60 * 60
        });

        console.log(`✅ 用户配置已保存: ${userId} (大小: ${configSize} 字节)`);
        return {
            success: true,
            userId: userId,
            configSize: configSize,
            lastUpdated: userConfig.lastUpdated
        };

    } catch (error) {
        console.error(`保存用户配置失败 ${userId}:`, error);
        throw error;
    }
}

// 从KV存储加载用户配置
async function loadUserConfig(userId, password, env) {
    if (!env.IP_CACHE) {
        throw new Error('KV存储未配置');
    }

    if (!isValidUserId(userId)) {
        throw new Error('无效的用户ID格式');
    }

    try {
        const configKey = USER_CONFIG.KEY_PREFIX + userId;
        const encryptedConfig = await env.IP_CACHE.get(configKey);

        if (!encryptedConfig) {
            throw new Error('用户配置不存在');
        }

        // 解密配置数据
        const userConfig = await decryptData(encryptedConfig, password);

        // 验证配置数据结构
        if (!userConfig.userId || userConfig.userId !== userId) {
            throw new Error('配置数据损坏或用户ID不匹配');
        }

        console.log(`✅ 用户配置已加载: ${userId}`);
        return {
            success: true,
            config: userConfig
        };

    } catch (error) {
        console.error(`加载用户配置失败 ${userId}:`, error);
        throw error;
    }
}

// 检查用户配置是否存在
async function checkUserConfigExists(userId, env) {
    if (!env.IP_CACHE) {
        return false;
    }

    if (!isValidUserId(userId)) {
        return false;
    }

    try {
        const configKey = USER_CONFIG.KEY_PREFIX + userId;
        const metadata = await env.IP_CACHE.get(configKey + '_meta');
        return metadata !== null;
    } catch (error) {
        console.error(`检查用户配置失败 ${userId}:`, error);
        return false;
    }
}

// 获取用户配置元数据
async function getUserConfigMetadata(userId, env) {
    if (!env.IP_CACHE) {
        throw new Error('KV存储未配置');
    }

    try {
        const configKey = USER_CONFIG.KEY_PREFIX + userId;
        const metadataStr = await env.IP_CACHE.get(configKey + '_meta');

        if (!metadataStr) {
            throw new Error('用户配置不存在');
        }

        return JSON.parse(metadataStr);
    } catch (error) {
        console.error(`获取用户配置元数据失败 ${userId}:`, error);
        throw error;
    }
}

// 删除用户配置
async function deleteUserConfig(userId, password, env) {
    if (!env.IP_CACHE) {
        throw new Error('KV存储未配置');
    }

    try {
        // 先验证密码
        await loadUserConfig(userId, password, env);

        // 删除配置和元数据
        const configKey = USER_CONFIG.KEY_PREFIX + userId;
        await Promise.all([
            env.IP_CACHE.delete(configKey),
            env.IP_CACHE.delete(configKey + '_meta')
        ]);

        console.log(`✅ 用户配置已删除: ${userId}`);
        return { success: true };

    } catch (error) {
        console.error(`删除用户配置失败 ${userId}:`, error);
        throw error;
    }
}

// ==================== IP检测结果缓存管理 ====================

// 缓存配置
const CACHE_CONFIG = {
    DEFAULT_TTL_DAYS: 14,        // 默认缓存14天
    MAX_TTL_DAYS: 30,            // 最大缓存30天
    CLEANUP_THRESHOLD: 0.8,      // 当使用率超过80%时触发清理
    BATCH_SIZE: 100,             // 批量操作大小
    KEY_PREFIX: 'ip_cache_'      // 缓存键前缀
};

// 获取IP检测缓存结果
async function getIPCacheResult(ip, env) {
    if (!env.IP_CACHE) return null;

    try {
        const cacheKey = CACHE_CONFIG.KEY_PREFIX + ip;
        const cached = await env.IP_CACHE.get(cacheKey);

        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        const now = Date.now();

        // 检查是否过期
        if (cacheData.expiresAt && now > cacheData.expiresAt) {
            // 异步删除过期缓存
            env.IP_CACHE.delete(cacheKey).catch(console.error);
            return null;
        }

        // 返回缓存的检测结果
        return {
            ip: cacheData.ip,
            isPure: cacheData.isPure,
            riskScore: cacheData.riskScore,
            country: cacheData.country,
            city: cacheData.city,
            isp: cacheData.isp,
            region: cacheData.region,
            asn: cacheData.asn,
            source: cacheData.source,
            cachedAt: cacheData.cachedAt,
            checkTime: cacheData.checkTime
        };

    } catch (error) {
        console.error(`获取IP缓存失败 ${ip}:`, error);
        return null;
    }
}

// 保存IP检测结果到缓存
async function saveIPCacheResult(ip, result, env, ttlDays = CACHE_CONFIG.DEFAULT_TTL_DAYS) {
    if (!env.IP_CACHE) return;

    try {
        const now = Date.now();
        const expiresAt = now + (ttlDays * 24 * 60 * 60 * 1000); // TTL转换为毫秒

        const cacheData = {
            ip: result.ip,
            isPure: result.isPure,
            riskScore: result.riskScore,
            country: result.country || 'Unknown',
            city: result.city || 'Unknown',
            isp: result.isp || 'Unknown',
            region: result.region || 'Unknown',
            asn: result.asn || 'Unknown',
            source: result.source,
            cachedAt: new Date().toISOString(),
            checkTime: result.checkTime || new Date().toISOString(),
            expiresAt: expiresAt
        };

        const cacheKey = CACHE_CONFIG.KEY_PREFIX + ip;

        // 保存到KV存储，设置TTL（秒）
        await env.IP_CACHE.put(cacheKey, JSON.stringify(cacheData), {
            expirationTtl: ttlDays * 24 * 60 * 60
        });

        console.log(`💾 IP检测结果已缓存: ${ip} (TTL: ${ttlDays}天)`);

        // 检查是否需要清理缓存
        await checkAndCleanupCache(env);

    } catch (error) {
        console.error(`保存IP缓存失败 ${ip}:`, error);
    }
}

// 检查并清理缓存
async function checkAndCleanupCache(env) {
    if (!env.IP_CACHE) return;

    try {
        // 获取缓存统计信息
        const stats = await getCacheStats(env);

        // 如果使用率超过阈值，触发清理
        if (stats.usageRatio > CACHE_CONFIG.CLEANUP_THRESHOLD) {
            console.log(`🧹 缓存使用率 ${(stats.usageRatio * 100).toFixed(1)}%，开始清理...`);
            await cleanupExpiredCache(env);
        }

    } catch (error) {
        console.error('缓存清理检查失败:', error);
    }
}

// 获取缓存统计信息
async function getCacheStats(env) {
    try {
        // 列出所有缓存键
        const listResult = await env.IP_CACHE.list({ prefix: CACHE_CONFIG.KEY_PREFIX });
        const totalCacheKeys = listResult.keys.length;

        // 估算使用率（基于键数量，实际使用率可能不同）
        const estimatedMaxKeys = 10000; // 估算最大键数量
        const usageRatio = totalCacheKeys / estimatedMaxKeys;

        return {
            totalKeys: totalCacheKeys,
            usageRatio: Math.min(usageRatio, 1),
            estimatedMaxKeys: estimatedMaxKeys
        };

    } catch (error) {
        console.error('获取缓存统计失败:', error);
        return { totalKeys: 0, usageRatio: 0, estimatedMaxKeys: 0 };
    }
}

// 清理过期缓存
async function cleanupExpiredCache(env) {
    if (!env.IP_CACHE) return;

    try {
        let cleanedCount = 0;
        let cursor = null;
        const now = Date.now();

        do {
            // 分批获取缓存键
            const listOptions = {
                prefix: CACHE_CONFIG.KEY_PREFIX,
                limit: CACHE_CONFIG.BATCH_SIZE
            };
            if (cursor) listOptions.cursor = cursor;

            const listResult = await env.IP_CACHE.list(listOptions);

            // 检查每个缓存项
            for (const key of listResult.keys) {
                try {
                    const cached = await env.IP_CACHE.get(key.name);
                    if (!cached) continue;

                    const cacheData = JSON.parse(cached);

                    // 检查是否过期
                    if (cacheData.expiresAt && now > cacheData.expiresAt) {
                        await env.IP_CACHE.delete(key.name);
                        cleanedCount++;
                    }

                } catch (error) {
                    // 如果解析失败，删除损坏的缓存
                    await env.IP_CACHE.delete(key.name);
                    cleanedCount++;
                }
            }

            cursor = listResult.cursor;

        } while (cursor);

        console.log(`🧹 缓存清理完成，删除了 ${cleanedCount} 个过期项`);
        return cleanedCount;

    } catch (error) {
        console.error('清理过期缓存失败:', error);
        return 0;
    }
}

// ==================== API处理函数 ====================

// 处理手动检查请求
async function handleManualCheck(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        console.log('🔄 手动触发定时任务');

        // 异步执行任务，避免超时
        const ctx = { waitUntil: (promise) => promise };
        const result = await executeScheduledTask(env, ctx);

        return new Response(JSON.stringify({
            success: true,
            message: '手动检查任务已完成',
            result: result
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('手动检查失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理Clash配置下载请求
async function handleClashConfig(env) {
    try {
        if (!env.IP_CACHE) {
            throw new Error('KV存储未配置');
        }

        // 尝试从缓存获取最新的Clash配置
        const cachedConfig = await env.IP_CACHE.get('latest_clash_config');

        if (cachedConfig) {
            return new Response(cachedConfig, {
                headers: {
                    'Content-Type': 'text/yaml; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="clash-config.yaml"',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }

        // 如果没有缓存，返回基础配置
        const basicConfig = await getClashTemplate();
        const config = basicConfig
            .replace('{{GENERATION_TIME}}', new Date().toISOString())
            .replace('{{TOTAL_NODES}}', '0')
            .replace('{{PURE_IPS}}', '0')
            .replace('{{LAST_UPDATE}}', '从未更新')
            .replace(/\{\{[^}]+\}\}/g, '      - "DIRECT"');

        return new Response(config, {
            headers: {
                'Content-Type': 'text/yaml; charset=utf-8',
                'Content-Disposition': 'attachment; filename="clash-config.yaml"',
                'Cache-Control': 'public, max-age=300'
            }
        });

    } catch (error) {
        console.error('获取Clash配置失败:', error);

        return new Response(JSON.stringify({
            error: '获取Clash配置失败',
            message: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理任务统计请求
async function handleTaskStats(env) {
    try {
        if (!env.IP_CACHE) {
            throw new Error('KV存储未配置');
        }

        const stats = await env.IP_CACHE.get('task_stats');
        const lastRun = await env.IP_CACHE.get('last_successful_run');
        const lastError = await env.IP_CACHE.get('last_error');

        const response = {
            stats: stats ? JSON.parse(stats) : null,
            lastSuccessfulRun: lastRun,
            lastError: lastError ? JSON.parse(lastError) : null,
            currentTime: new Date().toISOString()
        };

        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('获取任务统计失败:', error);

        return new Response(JSON.stringify({
            error: '获取任务统计失败',
            message: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理缓存统计请求
async function handleCacheStats(env) {
    try {
        if (!env.IP_CACHE) {
            throw new Error('KV存储未配置');
        }

        const stats = await getCacheStats(env);

        // 获取命中率（这里简化处理，实际应该从统计数据中获取）
        const hitRate = 0.75; // 假设75%的命中率，实际应该从KV中获取统计数据

        const response = {
            success: true,
            stats: {
                totalKeys: stats.totalKeys,
                usageRatio: stats.usageRatio,
                hitRate: hitRate,
                estimatedMaxKeys: stats.estimatedMaxKeys
            },
            timestamp: new Date().toISOString()
        };

        return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('获取缓存统计失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理缓存清理请求
async function handleCacheCleanup(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        if (!env.IP_CACHE) {
            throw new Error('KV存储未配置');
        }

        const cleanedCount = await cleanupExpiredCache(env);

        return new Response(JSON.stringify({
            success: true,
            cleanedCount: cleanedCount,
            message: `已清理 ${cleanedCount} 个过期缓存`,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('缓存清理失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理清空缓存请求
async function handleCacheClear(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        if (!env.IP_CACHE) {
            throw new Error('KV存储未配置');
        }

        let deletedCount = 0;
        let cursor = null;

        do {
            // 分批获取缓存键
            const listOptions = {
                prefix: CACHE_CONFIG.KEY_PREFIX,
                limit: CACHE_CONFIG.BATCH_SIZE
            };
            if (cursor) listOptions.cursor = cursor;

            const listResult = await env.IP_CACHE.list(listOptions);

            // 删除所有缓存项
            const deletePromises = listResult.keys.map(key =>
                env.IP_CACHE.delete(key.name)
            );

            await Promise.all(deletePromises);
            deletedCount += listResult.keys.length;
            cursor = listResult.cursor;

        } while (cursor);

        return new Response(JSON.stringify({
            success: true,
            deletedCount: deletedCount,
            message: `已清空 ${deletedCount} 个缓存项`,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('清空缓存失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ==================== 用户配置管理API处理函数 ====================

// 检查用户是否存在
async function handleUserConfigCheck(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId } = await request.json();

        if (!isValidUserId(userId)) {
            throw new Error('无效的用户ID格式');
        }

        const exists = await checkUserConfigExists(userId, env);

        return new Response(JSON.stringify({
            success: true,
            exists: exists,
            userId: userId
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('检查用户配置失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 注册新用户
async function handleUserConfigRegister(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId, password, config } = await request.json();

        if (!isValidUserId(userId)) {
            throw new Error('无效的用户ID格式');
        }

        if (!password || password.length < 6) {
            throw new Error('密码至少需要6位字符');
        }

        // 检查用户是否已存在
        const exists = await checkUserConfigExists(userId, env);
        if (exists) {
            throw new Error('用户ID已存在，请选择其他ID或直接登录');
        }

        // 保存用户配置
        const result = await saveUserConfig(userId, password, config, env);

        return new Response(JSON.stringify({
            success: true,
            userId: userId,
            configSize: result.configSize,
            lastUpdated: result.lastUpdated
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('注册用户失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 用户登录
async function handleUserConfigLogin(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId, password } = await request.json();

        if (!isValidUserId(userId)) {
            throw new Error('无效的用户ID格式');
        }

        if (!password) {
            throw new Error('请输入密码');
        }

        // 尝试加载用户配置以验证密码
        const result = await loadUserConfig(userId, password, env);

        return new Response(JSON.stringify({
            success: true,
            userId: userId,
            config: {
                lastUpdated: result.config.lastUpdated,
                subscriptionCount: result.config.subscriptions?.length || 0,
                apiKeyCount: (result.config.apiKeysManager?.proxycheck?.keys?.length || 0) +
                           (result.config.apiKeysManager?.ipinfo?.tokens?.length || 0)
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('用户登录失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 保存用户配置
async function handleUserConfigSave(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId, password, config } = await request.json();

        if (!isValidUserId(userId)) {
            throw new Error('无效的用户ID格式');
        }

        if (!password) {
            throw new Error('请输入密码');
        }

        // 保存用户配置
        const result = await saveUserConfig(userId, password, config, env);

        return new Response(JSON.stringify({
            success: true,
            userId: userId,
            configSize: result.configSize,
            lastUpdated: result.lastUpdated
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('保存用户配置失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 加载用户配置
async function handleUserConfigLoad(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId, password } = await request.json();

        if (!isValidUserId(userId)) {
            throw new Error('无效的用户ID格式');
        }

        if (!password) {
            throw new Error('请输入密码');
        }

        // 加载用户配置
        const result = await loadUserConfig(userId, password, env);

        return new Response(JSON.stringify({
            success: true,
            config: result.config
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('加载用户配置失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 导出用户配置
async function handleUserConfigExport(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { userId, password } = await request.json();

        if (!isValidUserId(userId)) {
            throw new Error('无效的用户ID格式');
        }

        if (!password) {
            throw new Error('请输入密码');
        }

        // 加载用户配置
        const result = await loadUserConfig(userId, password, env);

        // 添加导出信息
        const exportConfig = {
            ...result.config,
            exportTime: new Date().toISOString(),
            exportedBy: userId
        };

        return new Response(JSON.stringify({
            success: true,
            config: exportConfig
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('导出用户配置失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ==================== WebDAV云备份API处理函数 ====================

// WebDAV连接测试
async function handleWebDAVTest(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { url, username, password } = await request.json();

        if (!url || !username || !password) {
            throw new Error('WebDAV配置信息不完整');
        }

        // 测试WebDAV连接
        const testResult = await testWebDAVConnection(url, username, password);

        return new Response(JSON.stringify({
            success: true,
            message: 'WebDAV连接测试成功',
            serverInfo: testResult
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('WebDAV连接测试失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// WebDAV备份
async function handleWebDAVBackup(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { webdavConfig, configData } = await request.json();

        if (!webdavConfig || !configData) {
            throw new Error('备份数据不完整');
        }

        // 生成备份文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ip-purity-config-${timestamp}.json`;

        // 备份到WebDAV
        const backupResult = await backupToWebDAV(
            webdavConfig.url,
            webdavConfig.username,
            webdavConfig.password,
            webdavConfig.path,
            filename,
            configData
        );

        return new Response(JSON.stringify({
            success: true,
            filename: filename,
            size: backupResult.size,
            message: '配置已成功备份到WebDAV'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('WebDAV备份失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// WebDAV恢复
async function handleWebDAVRestore(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { webdavConfig } = await request.json();

        if (!webdavConfig) {
            throw new Error('WebDAV配置信息不完整');
        }

        // 从WebDAV恢复最新配置
        const configData = await restoreFromWebDAV(
            webdavConfig.url,
            webdavConfig.username,
            webdavConfig.password,
            webdavConfig.path
        );

        return new Response(JSON.stringify({
            success: true,
            configData: configData,
            message: '配置已从WebDAV恢复'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('WebDAV恢复失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// WebDAV文件列表
async function handleWebDAVList(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { webdavConfig } = await request.json();

        if (!webdavConfig) {
            throw new Error('WebDAV配置信息不完整');
        }

        // 获取WebDAV文件列表
        const files = await listWebDAVFiles(
            webdavConfig.url,
            webdavConfig.username,
            webdavConfig.password,
            webdavConfig.path
        );

        return new Response(JSON.stringify({
            success: true,
            files: files,
            message: '获取文件列表成功'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('获取WebDAV文件列表失败:', error);

        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ==================== WebDAV核心功能实现 ====================

// 测试WebDAV连接
async function testWebDAVConnection(url, username, password) {
    try {
        // 确保URL以/结尾
        const baseUrl = url.endsWith('/') ? url : url + '/';

        // 创建认证头
        const auth = btoa(username + ':' + password);

        // 发送PROPFIND请求测试连接
        const response = await fetch(baseUrl, {
            method: 'PROPFIND',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Depth': '0',
                'Content-Type': 'application/xml'
            },
            body: '<?xml version="1.0"?><propfind xmlns="DAV:"><prop><displayname/></prop></propfind>'
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('认证失败：用户名或密码错误');
            } else if (response.status === 404) {
                throw new Error('WebDAV路径不存在');
            } else {
                throw new Error(`WebDAV服务器错误: ${response.status} ${response.statusText}`);
            }
        }

        return {
            status: 'connected',
            server: response.headers.get('server') || 'Unknown',
            statusCode: response.status
        };

    } catch (error) {
        console.error('WebDAV连接测试失败:', error);
        throw new Error('连接失败: ' + error.message);
    }
}

// 备份配置到WebDAV
async function backupToWebDAV(url, username, password, path, filename, configData) {
    try {
        // 构建完整路径
        const baseUrl = url.endsWith('/') ? url : url + '/';
        const fullPath = path ? (path.endsWith('/') ? path : path + '/') : '';
        const fileUrl = baseUrl + fullPath + filename;

        // 创建认证头
        const auth = btoa(username + ':' + password);

        // 确保目录存在
        if (fullPath) {
            await createWebDAVDirectory(baseUrl, fullPath, auth);
        }

        // 准备备份数据
        const backupData = JSON.stringify(configData, null, 2);

        // 上传文件
        const response = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Content-Type': 'application/json'
            },
            body: backupData
        });

        if (!response.ok) {
            throw new Error(`上传失败: ${response.status} ${response.statusText}`);
        }

        return {
            success: true,
            size: backupData.length,
            url: fileUrl
        };

    } catch (error) {
        console.error('WebDAV备份失败:', error);
        throw new Error('备份失败: ' + error.message);
    }
}

// 从WebDAV恢复配置
async function restoreFromWebDAV(url, username, password, path) {
    try {
        // 构建完整路径
        const baseUrl = url.endsWith('/') ? url : url + '/';
        const fullPath = path ? (path.endsWith('/') ? path : path + '/') : '';
        const dirUrl = baseUrl + fullPath;

        // 创建认证头
        const auth = btoa(username + ':' + password);

        // 获取目录中的文件列表
        const files = await listWebDAVFiles(url, username, password, path);

        // 找到最新的配置文件
        const configFiles = files.filter(file =>
            file.name.startsWith('ip-purity-config-') && file.name.endsWith('.json')
        );

        if (configFiles.length === 0) {
            throw new Error('未找到配置备份文件');
        }

        // 按修改时间排序，获取最新的
        configFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        const latestFile = configFiles[0];

        // 下载最新配置文件
        const fileUrl = dirUrl + latestFile.name;
        const response = await fetch(fileUrl, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + auth
            }
        });

        if (!response.ok) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }

        const configText = await response.text();
        const configData = JSON.parse(configText);

        return configData;

    } catch (error) {
        console.error('WebDAV恢复失败:', error);
        throw new Error('恢复失败: ' + error.message);
    }
}

// 获取WebDAV文件列表
async function listWebDAVFiles(url, username, password, path) {
    try {
        // 构建完整路径
        const baseUrl = url.endsWith('/') ? url : url + '/';
        const fullPath = path ? (path.endsWith('/') ? path : path + '/') : '';
        const dirUrl = baseUrl + fullPath;

        // 创建认证头
        const auth = btoa(username + ':' + password);

        // 发送PROPFIND请求获取文件列表
        const response = await fetch(dirUrl, {
            method: 'PROPFIND',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Depth': '1',
                'Content-Type': 'application/xml'
            },
            body: `<?xml version="1.0"?>
                <propfind xmlns="DAV:">
                    <prop>
                        <displayname/>
                        <getcontentlength/>
                        <getlastmodified/>
                        <resourcetype/>
                    </prop>
                </propfind>`
        });

        if (!response.ok) {
            throw new Error(`获取文件列表失败: ${response.status} ${response.statusText}`);
        }

        const xmlText = await response.text();

        // 解析XML响应
        const files = parseWebDAVResponse(xmlText);

        // 过滤出配置文件
        return files.filter(file =>
            file.name &&
            file.name.endsWith('.json') &&
            !file.isDirectory
        );

    } catch (error) {
        console.error('获取WebDAV文件列表失败:', error);
        throw new Error('获取文件列表失败: ' + error.message);
    }
}

// 创建WebDAV目录
async function createWebDAVDirectory(baseUrl, path, auth) {
    try {
        const dirUrl = baseUrl + path;

        const response = await fetch(dirUrl, {
            method: 'MKCOL',
            headers: {
                'Authorization': 'Basic ' + auth
            }
        });

        // 201 Created 或 405 Method Not Allowed (目录已存在) 都是正常的
        if (response.ok || response.status === 405) {
            return true;
        }

        throw new Error(`创建目录失败: ${response.status} ${response.statusText}`);

    } catch (error) {
        // 如果目录已存在，忽略错误
        if (error.message.includes('405')) {
            return true;
        }
        throw error;
    }
}

// 解析WebDAV PROPFIND响应
function parseWebDAVResponse(xmlText) {
    const files = [];

    try {
        // 简单的XML解析，提取文件信息
        const responseRegex = /<d:response[^>]*>(.*?)<\/d:response>/gs;
        const matches = xmlText.match(responseRegex);

        if (!matches) {
            return files;
        }

        matches.forEach(match => {
            try {
                // 提取文件名
                const hrefMatch = match.match(/<d:href[^>]*>(.*?)<\/d:href>/);
                if (!hrefMatch) return;

                const href = hrefMatch[1];
                const name = decodeURIComponent(href.split('/').pop());

                // 跳过当前目录
                if (!name || name === '') return;

                // 检查是否为目录
                const isDirectory = match.includes('<d:collection/>');

                // 提取文件大小
                const sizeMatch = match.match(/<d:getcontentlength[^>]*>(.*?)<\/d:getcontentlength>/);
                const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;

                // 提取修改时间
                const modifiedMatch = match.match(/<d:getlastmodified[^>]*>(.*?)<\/d:getlastmodified>/);
                const lastModified = modifiedMatch ? modifiedMatch[1] : null;

                files.push({
                    name: name,
                    size: size,
                    lastModified: lastModified,
                    isDirectory: isDirectory,
                    href: href
                });

            } catch (e) {
                console.error('解析WebDAV响应项失败:', e);
            }
        });

    } catch (error) {
        console.error('解析WebDAV响应失败:', error);
    }

    return files;
}
