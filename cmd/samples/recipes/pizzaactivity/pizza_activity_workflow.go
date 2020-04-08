package main

import (
	"context"
	"go.uber.org/cadence"
	"go.uber.org/cadence/activity"
	"go.uber.org/cadence/workflow"
	"go.uber.org/zap"

	"github.com/jmoiron/jsonq"

	"encoding/json"
	"net/http"
	"bytes"
	"time"
)


const ApplicationName = "pizzaOrderWorkflow"

// SignalName is the signal name that workflow is waiting for
const SignalName = "trigger-signal"

type PizzaPhase string

const (
	PREP			 PizzaPhase = "PREP"
	BAKE			 PizzaPhase = "BAKE"
	BOX				 PizzaPhase = "BOX"
	DELIVERY	 PizzaPhase = "DELIVERY"
	DONE			 PizzaPhase = "DONE"
)

// This is registration process where you register all your workflows
// and activity function handlers.
func init() {
	workflow.Register(SignalHandlingWorkflow)
	activity.Register(startServerActivity)
	activity.Register(prepActivity)
	activity.Register(bakeActivity)
	activity.Register(boxActivity)
	activity.Register(deliveryActivity)
	activity.Register(doneActivity)
	activity.Register(findAvailableDriverActivity)
	activity.Register(notifyDeliveryActivity)
}

func SignalHandlingWorkflow(ctx workflow.Context) error {
	logger := workflow.GetLogger(ctx)
	execution := workflow.GetInfo(ctx).WorkflowExecution;
	wfID := execution.ID
	runID := execution.RunID

	logger.Info("Workflow Id", zap.Any("WorkflowID", wfID))
	logger.Info("Run Id", zap.Any("RunID", runID))

	ao := workflow.ActivityOptions{
		ScheduleToStartTimeout: time.Minute,
		StartToCloseTimeout:		time.Minute,
		HeartbeatTimeout:				time.Second * 20,
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	var postResult bool
	err := workflow.ExecuteActivity(ctx, startServerActivity,
		wfID, runID).Get(ctx, &postResult)
	if err != nil {
		logger.Error("Activity failed.", zap.Error(err))
		return err
	}
	logger.Info("Registered workflow with HTTP server")

	ch := workflow.GetSignalChannel(ctx, SignalName)
	for {
		var signal string
		if more := ch.Receive(ctx, &signal); !more {
			logger.Info("Signal channel closed")
			return cadence.NewCustomError("signal_channel_closed")
		}

		logger.Info("Signal received.", zap.String("signal", signal))

		if signal == "exit" {
			break
		} else if signal == "PREP" {
			err := workflow.ExecuteActivity(ctx, prepActivity).Get(ctx, nil)
			if err != nil {
				logger.Error("Activity failed.", zap.Error(err))
				return err
			}
		} else if signal == "BAKE" {
			err := workflow.ExecuteActivity(ctx, bakeActivity).Get(ctx, nil)
			if err != nil {
				logger.Error("Activity failed.", zap.Error(err))
				return err
			}
		} else if signal == "BOX" {
			err := workflow.ExecuteActivity(ctx, boxActivity).Get(ctx, nil)
			if err != nil {
				logger.Error("Activity failed.", zap.Error(err))
				return err
			}
		} else if signal == "DELIVERY" {
			err := workflow.ExecuteActivity(ctx, deliveryActivity).Get(ctx, nil)
			if err != nil {
				logger.Error("Activity failed.", zap.Error(err))
				return err
			}
			break
		}

		logger.Sugar().Infof("Processed signal: %v", signal)
	}

	for {
		var available bool
		err := workflow.ExecuteActivity(
			ctx,
			findAvailableDriverActivity,
		).Get(ctx, &available)

		if err != nil {
			logger.Error("Activity failed.", zap.Error(err))
			return err
		}

		if available == true {
			break;
		}

		err = workflow.Sleep(ctx, 10 * time.Second)

		if err != nil {
			logger.Error("Issue when sleeping")
		}
	}

	err = workflow.ExecuteActivity(
		ctx,
		notifyDeliveryActivity,
	).Get(ctx, nil)

	if err != nil {
		logger.Error("Notifying user failed", zap.Error(err))
		return err
	}

	err = workflow.Sleep(ctx, 10 * time.Second)
	if err != nil {
		logger.Error("Issue when sleeping")
	}

	err = workflow.ExecuteActivity(
		ctx,
		doneActivity,
	).Get(ctx, nil)

	if err != nil {
		logger.Error("Failed to tell user that pizza is done", zap.Error(err))
		return err
	}


	return nil
}

type RequestData struct {
	path string
	body map[string]string
}

type BData map[string]interface{}

// REPLACE ME WITH YOUR NodeJS server endpoint
var baseUrl = "https://d0c3003f.ngrok.io"

func postRequest(r RequestData) (BData, error) {
	url := baseUrl + r.path
	requestBody, err := json.Marshal(r.body)

	if err != nil {
		return BData{}, err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(requestBody))
	
	if err != nil {
		return BData{}, err
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func getRequest(path string) (interface{}, error) {
	url := baseUrl + path

	resp, err := http.Get(url)
 
	if err != nil {
		return BData{}, err
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func findAvailableDriverActivity(ctx context.Context) (bool, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("prep activity started")

	data, err := getRequest("/driverAvailable")
	if err != nil {
		return false, err
	}

	jq := jsonq.NewQuery(data)
	return jq.Bool("available")
}

func prepActivity(ctx context.Context) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("prep activity started")

	return postRequest(RequestData{
		path: "/prep",
		body: map[string]string{},
	})
}

func notifyDeliveryActivity(ctx context.Context) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("notify delivery activity started")

	return postRequest(RequestData{
		path: "/notify-user-of-delivery",
		body: map[string]string{},
	})
}

func bakeActivity(ctx context.Context) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("bake activity started")

	return postRequest(RequestData{
		path: "/bake",
		body: map[string]string{},
	})
}

func boxActivity(ctx context.Context) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("box activity started")

	return postRequest(RequestData{
		path: "/box",
		body: map[string]string{},
	})
}

func deliveryActivity(ctx context.Context) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("awaiting delivery activity started")

	return postRequest(RequestData{
		path: "/awaiting-delivery",
		body: map[string]string{},
	})
}

func doneActivity(ctx context.Context) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("done activity started")

	return postRequest(RequestData{
		path: "/done",
		body: map[string]string{},
	})
}

func startServerActivity(ctx context.Context, wfID string, runID string) (BData, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("startserver activity started")

	return postRequest(RequestData{
		path: "/registerWorkflow",
		body: map[string]string{
			"ID": wfID,
			"runID": runID,
		},
	})
}
