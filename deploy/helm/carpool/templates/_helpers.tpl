{{/*
Expand the name of the chart.
*/}}
{{- define "carpool.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "carpool.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "carpool.mysql.fullname" -}}
{{- printf "%s-mysql" (include "carpool.fullname" .) }}
{{- end }}

{{- define "carpool.backend.fullname" -}}
{{- printf "%s-backend" (include "carpool.fullname" .) }}
{{- end }}

{{- define "carpool.frontend.fullname" -}}
{{- printf "%s-frontend" (include "carpool.fullname" .) }}
{{- end }}

{{- define "carpool.labels" -}}
helm.sh/chart: {{ include "carpool.chart" . }}
{{ include "carpool.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "carpool.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "carpool.selectorLabels" -}}
app.kubernetes.io/name: {{ include "carpool.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "carpool.mysql.labels" -}}
{{ include "carpool.labels" . }}
app.kubernetes.io/component: mysql
{{- end }}

{{- define "carpool.backend.labels" -}}
{{ include "carpool.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{- define "carpool.frontend.labels" -}}
{{ include "carpool.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{- define "carpool.mysql.selectorLabels" -}}
{{ include "carpool.selectorLabels" . }}
app.kubernetes.io/component: mysql
{{- end }}

{{- define "carpool.backend.selectorLabels" -}}
{{ include "carpool.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{- define "carpool.frontend.selectorLabels" -}}
{{ include "carpool.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{- define "carpool.mysql.jdbcUrl" -}}
{{- printf "jdbc:mysql://%s:3306/%s?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" (include "carpool.mysql.fullname" .) .Values.mysql.database }}
{{- end }}

{{- define "carpool.publicBaseUrl" -}}
{{- .Values.publicBaseUrl | trimSuffix "/" }}
{{- end }}
