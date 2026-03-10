import { createScheduledHandler } from '../_shared/function-handler.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { logger } from '../_shared/logging.ts';
import { deliverAlert } from '../_shared/alert-delivery.ts';

async function handleCheckBudgetAlerts(supabaseAdmin: SupabaseClient) {
  const traceContext = { traceId: 'budget-checker' };

  try {
    await logger.info('Starting budget alerts check', {}, traceContext);

    // Get all enabled budget configs
    const { data: budgets, error: budgetsError } = await supabaseAdmin
      .from('budget_configs')
      .select('*')
      .eq('enabled', true);

    if (budgetsError) {
      await logger.error(
        'Error fetching budget configs',
        { error: budgetsError.message },
        traceContext,
      );
      throw budgetsError;
    }

    if (!budgets || budgets.length === 0) {
      await logger.info('No budget configs found', {}, traceContext);
      return {
        message: 'No budget configs to check',
        checked: 0,
      };
    }

    let alertsCreated = 0;

    // Check each budget
    for (const budget of budgets) {
      try {
        // Call the database function to check and create alerts
        const { error: checkError } = await supabaseAdmin.rpc(
          'check_budget_alerts',
          {
            p_service_name: budget.service_name,
          },
        );

        if (checkError) {
          await logger.error(
            'Error checking budget alerts',
            {
              error: checkError.message,
              service_name: budget.service_name,
            },
            traceContext,
          );
          continue;
        }

        // Check if any new alerts were created
        const { data: recentAlerts } = await supabaseAdmin
          .from('budget_alerts')
          .select('*')
          .eq('service_name', budget.service_name)
          .eq('resolved_at', null)
          .gte('sent_at', new Date(new Date().getTime() - 60000).toISOString()); // Last minute

        if (recentAlerts && recentAlerts.length > 0) {
          alertsCreated += recentAlerts.length;
          await logger.warn(
            'Budget alerts created',
            {
              service_name: budget.service_name,
              alert_count: recentAlerts.length,
            },
            traceContext,
          );

          // Deliver alerts via configured channels (email, Slack, database)
          for (const alert of recentAlerts) {
            try {
              await deliverAlert(supabaseAdmin, {
                id: alert.id,
                type: 'budget',
                serviceName: alert.service_name,
                level: alert.alert_level,
                message:
                  alert.message || `Budget alert for ${alert.service_name}`,
                percentage: Number(alert.percentage) || 0,
                sentAt: alert.sent_at,
              });
            } catch (deliveryError) {
              await logger.error(
                'Failed to deliver alert',
                {
                  error:
                    deliveryError instanceof Error
                      ? deliveryError.message
                      : String(deliveryError),
                  alert_id: alert.id,
                },
                traceContext,
              );
            }
          }
        }
      } catch (error) {
        await logger.error(
          'Exception checking budget',
          {
            error: error instanceof Error ? error.message : String(error),
            service_name: budget.service_name,
          },
          traceContext,
        );
      }
    }

    await logger.info(
      'Budget alerts check completed',
      {
        budgets_checked: budgets.length,
        alerts_created: alertsCreated,
      },
      traceContext,
    );

    return {
      message: 'Budget alerts check completed',
      budgets_checked: budgets.length,
      alerts_created: alertsCreated,
    };
  } catch (error) {
    await logger.error(
      'Critical error in budget alerts check',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    throw error;
  }
}

export default createScheduledHandler(handleCheckBudgetAlerts);
