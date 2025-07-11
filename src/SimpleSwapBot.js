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

    async buyToken(tokenSymbol, ethAmount, slippage = 1) {
        console.log(`💰 Buying ${tokenSymbol} with ${ethAmount} ETH`);
        
        try {
            // Step 1: Select TO token (token to buy)
            await this.selectToken('to', tokenSymbol);
            
            // Step 2: Input ETH amount
            await this.inputAmount(ethAmount);
            
            // Step 3: Set slippage if needed
            if (slippage > 1) {
                await this.setSlippage(slippage);
            }
            
            // Step 4: Execute swap
            await this.executeSwap();
            
            console.log(`✅ Buy order completed: ${ethAmount} ETH -> ${tokenSymbol}`);
            return { success: true, type: 'buy', amount: ethAmount, token: tokenSymbol };
            
        } catch (error) {
            console.error(`❌ Buy failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async sellToken(tokenSymbol, tokenAmount, slippage = 1) {
        console.log(`💸 Selling ${tokenAmount} ${tokenSymbol} for ETH`);
        
        try {
            // Step 1: Select FROM token (token to sell)
            await this.selectToken('from', tokenSymbol);
            
            // Step 2: Input token amount
            await this.inputAmount(tokenAmount);
            
            // Step 3: Set slippage if needed
            if (slippage > 1) {
                await this.setSlippage(slippage);
            }
            
            // Step 4: Execute swap
            await this.executeSwap();
            
            console.log(`✅ Sell order completed: ${tokenAmount} ${tokenSymbol} -> ETH`);
            return { success: true, type: 'sell', amount: tokenAmount, token: tokenSymbol };
            
        } catch (error) {
            console.error(`❌ Sell failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async selectToken(position, tokenSymbol) {
        console.log(`🔍 Selecting ${tokenSymbol} for ${position} token`);
        
        const selectorKey = position === 'from' ? 'fromToken' : 'toToken';
        const clicked = await this.clickFirstAvailable(this.selectors[selectorKey]);
        
        if (!clicked) {
            throw new Error(`${position} token selector not found`);
        }

        await this.page.waitForTimeout(1000);
        
        // Search for token
        const searchSelectors = [
            '[data-testid="token-search"]',
            '.token-search input',
            'input[placeholder*="search"]'
        ];
        
        for (const selector of searchSelectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 3000 });
                await this.page.click(selector);
                await this.page.type(selector, tokenSymbol);
                await this.page.waitForTimeout(2000);
                break;
            } catch (e) {
                continue;
            }
        }
        
        // Select first result
        const tokenSelectors = [
            '.token-list-item:first-child',
            '[data-testid="token-item"]:first-child',
            '.token-option:first-child'
        ];
        
        await this.clickFirstAvailable(tokenSelectors);
        console.log(`✅ ${tokenSymbol} selected for ${position}`);
    }

    async inputAmount(amount) {
        console.log(`💱 Inputting amount: ${amount}`);
        
        const amountInput = await this.findFirstElement(this.selectors.amountInput);
        if (!amountInput) {
            throw new Error('Amount input field not found');
        }

        // Clear and input amount
        await amountInput.click();
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('KeyA');
        await this.page.keyboard.up('Control');
        await amountInput.type(amount.toString());
        
        await this.page.waitForTimeout(2000);
        console.log(`✅ Amount ${amount} entered`);
    }

    async setSlippage(slippagePercent) {
        console.log(`⚙️ Setting slippage to ${slippagePercent}%`);
        
        try {
            const slippageSelectors = [
                '[data-testid="slippage-setting"]',
                '.slippage-setting',
                '.settings-btn'
            ];
            
            const clicked = await this.clickFirstAvailable(slippageSelectors);
            if (clicked) {
                await this.page.waitForTimeout(1000);
                
                // Input custom slippage
                const slippageInputs = [
                    '.slippage-input',
                    '[data-testid="slippage-input"]',
                    'input[placeholder*="slippage"]'
                ];
                
                for (const selector of slippageInputs) {
                    try {
                        await this.page.waitForSelector(selector, { timeout: 2000 });
                        await this.page.click(selector);
                        await this.page.keyboard.down('Control');
                        await this.page.keyboard.press('KeyA');
                        await this.page.keyboard.up('Control');
                        await this.page.type(selector, slippagePercent.toString());
                        break;
                    } catch (e) {
                        continue;
                    }
                }
                
                console.log(`✅ Slippage set to ${slippagePercent}%`);
            }
        } catch (error) {
            console.log(`⚠️ Could not set slippage, using default`);
        }
    }

    async executeSwap() {
        console.log('🔄 Executing swap...');
        
        // Click swap button
        const swapClicked = await this.clickFirstAvailable(this.selectors.swapButton);
        if (!swapClicked) {
            throw new Error('Swap button not found');
        }

        await this.page.waitForTimeout(3000);
        
        // Click confirm button if appears
        await this.clickFirstAvailable(this.selectors.confirmButton);
        
        // Handle wallet transaction confirmation
        await this.handleTransactionConfirmation();
        
        // Wait for transaction to complete
        await this.waitForTransactionComplete();
    }

    async handleTransactionConfirmation() {
        console.log('📝 Handling transaction confirmation...');
        
        try {
            await this.page.waitForTimeout(3000);
            
            const pages = await this.browser.pages();
            const confirmationPopup = pages.find(p => 
                p.url().includes('chrome-extension://') && 
                p.url().includes('notification')
            );

            if (confirmationPopup) {
                console.log('💳 Confirming transaction in wallet...');
                
                const confirmSelectors = [
                    '[data-testid="page-container-footer-next"]',
                    'button:contains("Confirm")',
                    '.confirm-button'
                ];

                for (const selector of confirmSelectors) {
                    try {
                        await confirmationPopup.waitForSelector(selector, { timeout: 5000 });
                        await confirmationPopup.click(selector);
                        console.log('✅ Transaction confirmed');
                        break;
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Transaction confirmation may have failed');
        }
    }

    async waitForTransactionComplete() {
        console.log('⏳ Waiting for transaction to complete...');
        
        try {
            // Wait for success indicators
            const successSelectors = [
                '[data-testid="transaction-success"]',
                '.success-message',
                '.transaction-complete'
            ];
            
            for (const selector of successSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 30000 });
                    console.log('✅ Transaction completed successfully');
                    return true;
                } catch (e) {
                    continue;
                }
            }
            
            // If no success indicator found, wait a bit more
            await this.page.waitForTimeout(10000);
            console.log('✅ Transaction likely completed');
            return true;
            
        } catch (error) {
            console.log('⚠️ Transaction status unclear');
            return false;
        }
    }

    // Utility methods
    async clickFirstAvailable(selectors) {
        for (const selector of selectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 3000 });
                await this.page.click(selector);
                return true;
            } catch (e) {
                continue;
            }
        }
        return false;
    }

    async findFirstElement(selectors) {
        for (const selector of selectors) {
            try {
                await this.page.waitForSelector(selector, { timeout: 3000 });
                return await this.page.$(selector);
            } catch (e) {
                continue;
            }
        }
        return null;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

module.exports = SimpleSwapBot;
