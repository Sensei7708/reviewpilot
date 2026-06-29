import { Command } from 'commander';
import chalk from 'chalk';
import { activateLicense, getStoredLicense, getLicenseTier } from '../../license/validator.js';

export const licenseCommand = new Command('license')
  .description('Manage your ReviewPilot license')
  .addCommand(
    new Command('activate')
      .description('Activate a pro license key')
      .argument('<key>', 'License key from Gumroad')
      .action((key: string) => {
        try {
          const license = activateLicense(key);
          console.log(chalk.green('\n License activated successfully!\n'));
          console.log(`  Tier:   ${chalk.bold(license.tier.toUpperCase())}`);
          console.log(`  Email:  ${license.email || 'N/A'}`);
          console.log(`  Key:    ${license.key.slice(0, 8)}...${license.key.slice(-4)}`);
          if (license.expiresAt) {
            console.log(`  Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
          }
          console.log('');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(`\n License activation failed: ${message}\n`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Check current license status')
      .action(() => {
        const tier = getLicenseTier();
        const license = getStoredLicense();

        if (tier === 'free') {
          console.log(chalk.blue('\n Edition: Free\n'));
          console.log('  Upgrade to Pro for:');
          console.log('  - Unlimited repos');
          console.log('  - GitHub Action integration');
          console.log('  - Advanced rules');
          console.log('  - Team features');
          console.log('');
          console.log('  Buy a license: https://reviewpilot.dev');
          console.log('');
        } else {
          console.log(chalk.green(`\n Edition: ${tier.toUpperCase()}\n`));
          if (license) {
            console.log(`  Key:  ${license.key.slice(0, 8)}...${license.key.slice(-4)}`);
            console.log(`  Tier: ${license.tier}`);
            if (license.email) console.log(`  Email: ${license.email}`);
            if (license.expiresAt) {
              console.log(`  Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
            }
          }
          console.log('');
        }
      })
  );
