const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class SimpleSwapBot {
    constructor(options = {}) {
        this.headless = options.headless || false;
        this.timeout = options.timeout || 30000;
        this.browser = null;
        this.page = null;
        
        // Common selectors untuk OKX Web3
        this.selectors = {
            connectWallet: [
                '[data-testid="connect-wallet"]',
                'button:contains("Connect")',
                '.connect-wallet-btn',
                '[class*="connect"]'
            ],
            fromToken: [
                '[data-testid="from-token-select"]',
                '.from-token-selector',
                '.token-select:first-child'
            ],
            toToken: [
                '[data-testid="to-token-select"]',
                '.to-token-selector',
                '.token-select:last-child'
            ],
            amountInput: [
                '[data-testid="amount-input"]',
                '.amount-input input',
                'input[placeholder*="amount"]',
                'input[type="number"]'
            ],
            swapButton: [
                '[data-testid="swap-button"]',
                'button:contains("Swap")',
                '.swap-btn'
            ],
            confirmButton: [
                '[data-testid="confirm"]',
                'button:contains("Confirm")',
                '.confirm-btn'
            ]
        };
    }

    async init() {
        console.log('🚀 Initializing browser...');
        
        this.browser = await puppeteer.launch({
            headless: this.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });

        this.page = await this.browser.newPage();
        
        // Set realistic user agent
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        );

        console.log('✅ Browser initialized');
    }

    async navigateToToken(tokenAddress) {
        const url = `https://web3.okx.com/id/token/arbitrum-one/${tokenAddress}`;
        
        console.log(`🌐 Navigating to: ${url}`);
        await this.page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: this.timeout 
        });
        
        // Wait for swap interface to load
        await this.page.waitForTimeout(3000);
        console.log('✅ Page loaded');
    }

    async connectWallet() {
        console.log('🔗 Connecting wallet...');
        
        try {
            // Try to find and click connect wallet button
            const clicked = await this.clickFirstAvailable(this.selectors.connectWallet);
            
            if (clicked) {
                await this.page.waitForTimeout(2000);
                
                // Handle wallet popup if appears
                await this.handleWalletPopup();
                
                console.log('✅ Wallet connected');
                return true;
            } else {
                console.log('ℹ️ Wallet may already be connected');
                return true;
            }
        } catch (error) {
            console.error('❌ Wallet connection failed:', error.message);
            return false;
        }
    }

    async handleWalletPopup() {
        try {
            await this.page.waitForTimeout(2000);
            
            const pages = await this.browser.pages();
            const walletPopup = pages.find(p => 
                p.url().includes('chrome-extension://') || 
                p.url().includes('wallet')
            );

            if (walletPopup) {
                console.log('📱 Handling wallet popup...');
                
                const connectSelectors = [
                    'button[data-testid="page-container-footer-next"]',
                    'button:contains("Connect")',
                    '.btn-primary'
                ];

                for (const selector of connectSelectors) {
                    try {
                        await walletPopup.waitForSelector(selector, { timeout: 3000 });
                        await walletPopup.click(selector);
                        await walletPopup.waitForTimeout(1000);
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Wallet popup handling skipped');
        }
    }
}
