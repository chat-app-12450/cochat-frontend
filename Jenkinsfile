pipeline {
  agent {
    kubernetes {
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins/jenkins-agent: "true"
spec:
  containers:
    - name: jnlp
      image: jenkins/inbound-agent:3327.v868139a_d00e0-6
      tty: true
    - name: node
      image: node:20-alpine
      tty: true
      command: ["/bin/sh", "-c"]
      args: ["sleep 365d"]
      volumeMounts:
        - name: node-cache
          mountPath: /home/jenkins/.npm
    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      tty: true
      command: ["/busybox/sh", "-c"]
      args: ["sleep 365d"]
      volumeMounts:
        - name: dockerhub-secret
          mountPath: /kaniko/.docker/
          readOnly: true
  volumes:
    - name: dockerhub-secret
      secret:
        secretName: dockerhub-secret
        items:
          - key: .dockerconfigjson
            path: config.json
    - name: node-cache
      persistentVolumeClaim:
        claimName: node-cache-pvc
"""
    }
  }

  environment {
    DOCKER_REPO = 'docker.io/dockeracckai'
    IMAGE_NAME  = 'chat-frontend'
    TAG         = "${new Date().format('yyyyMMdd')}-${UUID.randomUUID().toString().take(4)}"
  }

  stages {

    stage('npm install & build') {
      steps {
        container('node') {
          sh '''
            echo "📦 Installing dependencies and building React..."
            npm ci --cache /home/jenkins/.npm
            CI=false npm run build
          '''
        }
      }
    }

    stage('Build & Push React Frontend Image') {
      steps {
        container('kaniko') {
          sh '''
            echo "🧱 Building React frontend image..."
            /kaniko/executor \
              --context $WORKSPACE \
              --dockerfile $WORKSPACE/Dockerfile \
              --destination=${DOCKER_REPO}/${IMAGE_NAME}:${TAG} \
              --skip-tls-verify
          '''
        }
      }
    }

    stage('Update Helm Repo Image Tag') {
      steps {
        withCredentials([string(credentialsId: 'gitea-pat-secret', variable: 'TOKEN')]) {
          sh '''
            TOKEN_CLEAN=$(echo -n "$TOKEN" | tr -d '[:space:]')
            rm -rf helm_repo || true
            git clone -b main http://jenkins:${TOKEN_CLEAN}@gitea-http.infra.svc.cluster.local:3000/chaops/helm_repo.git

            cd helm_repo
            sed -i "s|tag:.*|tag: \\"$TAG\\"|g" server/frontend/values.yaml

            git config user.email "jenkins@infra.local"
            git config user.name "jenkins"
            git add server/chat-frontend/values.yaml
            git commit -am "Update frontend image tag to ${TAG}" || echo "No changes to commit"
            git push origin main
          '''
        }
      }
    }
  }

  post {
    success { echo "✅ Frontend image pushed and Helm repo updated successfully!" }
    failure { echo "❌ Build or push failed!" }
  }
}
