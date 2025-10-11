@echo off
echo ========================================
echo Setting up FastBite Kafka Topics
echo ========================================
echo.

set KAFKA_BROKER=localhost:9092
set KAFKA_HOME=C:\kafka

echo Kafka Broker: %KAFKA_BROKER%
echo Kafka Home: %KAFKA_HOME%
echo.
echo Creating topics with 3 partitions and replication factor 1...
echo.

REM Order Topics
call :create_topic "order-created" "Order creation events"
call :create_topic "order-accepted" "Order accepted by restaurant"
call :create_topic "order-picked-up" "Order picked up by rider"
call :create_topic "order-delivered" "Order delivered to customer"
call :create_topic "order-cancelled" "Order cancellation events"
call :create_topic "order-rating-submitted" "Order rating events"
call :create_topic "order-status-changed" "Order status change events"

REM Menu Topics
call :create_topic "menu-item-created" "New menu item created"
call :create_topic "menu-item-updated" "Menu item updated"
call :create_topic "menu-item-deleted" "Menu item deleted"
call :create_topic "menu-item-out-of-stock" "Menu item stock events"

REM Notification Topics
call :create_topic "notification-created" "Notification creation events"
call :create_topic "notification-sent" "Notification sent events"
call :create_topic "notification-read" "Notification read events"

REM User Topics
call :create_topic "user-registered" "User registration events"
call :create_topic "user-status-changed" "User status change events"

REM Rider Topics
call :create_topic "rider-availability-changed" "Rider availability events"
call :create_topic "rider-location-update" "Rider location updates"

REM Communication Topics
call :create_topic "sms-requested" "SMS notification requests"
call :create_topic "email-requested" "Email notification requests"
call :create_topic "push-notification-requested" "Push notification requests"

REM Analytics Topics
call :create_topic "daily-stats-calculated" "Daily statistics events"
call :create_topic "revenue-milestone-reached" "Revenue milestone events"

REM System Topics
call :create_topic "system-announcement" "System announcements"
call :create_topic "maintenance-scheduled" "Maintenance schedule events"

echo.
echo ========================================
echo Topic Creation Complete!
echo ========================================
echo.
echo Listing all topics:
echo.
%KAFKA_HOME%\bin\windows\kafka-topics.bat --list --bootstrap-server %KAFKA_BROKER% 2>nul

echo.
echo ========================================
echo Getting topic details:
echo ========================================
echo.
%KAFKA_HOME%\bin\windows\kafka-topics.bat --describe --bootstrap-server %KAFKA_BROKER% 2>nul

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To verify topics, run:
echo   kafka-topics.bat --list --bootstrap-server %KAFKA_BROKER%
echo.
echo To see topic details, run:
echo   kafka-topics.bat --describe --bootstrap-server %KAFKA_BROKER% --topic [topic-name]
echo.
pause
goto :eof

:create_topic
echo [%time%] Creating topic: %~1
%KAFKA_HOME%\bin\windows\kafka-topics.bat --create ^
  --bootstrap-server %KAFKA_BROKER% ^
  --topic %~1 ^
  --partitions 3 ^
  --replication-factor 1 ^
  --if-not-exists ^
  --config retention.ms=604800000 ^
  2>nul
if %errorlevel% equ 0 (
    echo           [OK] %~1 - %~2
) else (
    echo           [EXISTS] %~1 already exists
)
goto :eof