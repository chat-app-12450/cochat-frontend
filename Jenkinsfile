pipeline {
  agent {
    kubernetes {
      defaultContainer 'git'
      yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: git
      image: alpine/git:2.45.2
      command:
        - cat
      tty: true
    - name: kaniko
      image: gcr.io/kaniko-project/executor:v1.23.2-debug
      command:
        - /busybox/cat
      tty: true
'''
    }
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  parameters {
    string(name: 'IMAGE_TAG', defaultValue: '', description: '비우면 현재 git sha short 값을 사용합니다.')
    string(name: 'DOCKER_IMAGE_REPOSITORY', defaultValue: 'docker.io/spotifyyyyy/chat-frontend', description: '푸시할 Docker 이미지 repository')
    string(name: 'INFRA_REPO_URL', defaultValue: 'git@github.com:xcdev-0/chat-platform-infra.git', description: 'Helm values를 관리하는 infra 저장소 URL')
    string(name: 'INFRA_BRANCH', defaultValue: 'main', description: 'infra 저장소 브랜치')
    string(name: 'INFRA_VALUES_PATH', defaultValue: 'infra-aws/environments/dev/apps/frontend-values.yaml', description: '업데이트할 values 파일 경로')
  }

  environment {
    DOCKERHUB_CREDENTIALS_ID = 'dockerhub-credentials'
    INFRA_DIR = "${WORKSPACE}/.infra-repo"
    GIT_COMMITTER_NAME = 'Jenkins'
    GIT_COMMITTER_EMAIL = 'jenkins@kube.com'
    DEFAULT_DOCKER_IMAGE_REPOSITORY = 'docker.io/spotifyyyyy/chat-frontend'
    DEFAULT_INFRA_REPO_URL = 'git@github.com:xcdev-0/chat-platform-infra.git'
    DEFAULT_INFRA_BRANCH = 'main'
    DEFAULT_INFRA_VALUES_PATH = 'infra-aws/environments/dev/apps/frontend-values.yaml'
  }

  stages {
    stage('Prepare') {
      steps {
        container('git') {
          checkout scm
          script {
            sh 'git config --global --add safe.directory "$WORKSPACE"'
            env.RESOLVED_DOCKER_IMAGE_REPOSITORY = params.DOCKER_IMAGE_REPOSITORY?.trim() ?: env.DEFAULT_DOCKER_IMAGE_REPOSITORY
            env.RESOLVED_INFRA_REPO_URL = params.INFRA_REPO_URL?.trim() ?: env.DEFAULT_INFRA_REPO_URL
            env.RESOLVED_INFRA_BRANCH = params.INFRA_BRANCH?.trim() ?: env.DEFAULT_INFRA_BRANCH
            env.RESOLVED_INFRA_VALUES_PATH = params.INFRA_VALUES_PATH?.trim() ?: env.DEFAULT_INFRA_VALUES_PATH
            env.RESOLVED_IMAGE_TAG = params.IMAGE_TAG?.trim()
              ? params.IMAGE_TAG.trim()
              : sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
          }
        }
      }
    }

    stage('Build And Push Image') {
      steps {
        container('kaniko') {
          withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
            sh '''
              mkdir -p /kaniko/.docker
cat > /kaniko/.docker/config.json <<EOF
{
  "auths": {
    "https://index.docker.io/v1/": {
      "username": "${DOCKER_USERNAME}",
      "password": "${DOCKER_PASSWORD}"
    }
  }
}
EOF

              /kaniko/executor \
                --context "$WORKSPACE" \
                --dockerfile "$WORKSPACE/Dockerfile" \
                --destination "${RESOLVED_DOCKER_IMAGE_REPOSITORY}:${RESOLVED_IMAGE_TAG}" \
                --cache=true
            '''
          }
        }
      }
    }

    stage('Update Infra Repo') {
      steps {
        container('git') {
          sshagent(credentials: ['github-ssh']) {
            sh '''
              mkdir -p "$HOME/.ssh"
              chmod 700 "$HOME/.ssh"
              touch "$HOME/.ssh/known_hosts"
              chmod 600 "$HOME/.ssh/known_hosts"
              ssh-keyscan -H github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null
              git config --global --add safe.directory "$INFRA_DIR"

              rm -rf "$INFRA_DIR"
              git clone --depth 1 --branch "$RESOLVED_INFRA_BRANCH" "$RESOLVED_INFRA_REPO_URL" "$INFRA_DIR"

              sh "$INFRA_DIR/infra-shared/cicd/update_image_tag.sh" \
                "$INFRA_DIR/$RESOLVED_INFRA_VALUES_PATH" \
                "$RESOLVED_DOCKER_IMAGE_REPOSITORY" \
                "$RESOLVED_IMAGE_TAG"

              git -C "$INFRA_DIR" config user.name "$GIT_COMMITTER_NAME"
              git -C "$INFRA_DIR" config user.email "$GIT_COMMITTER_EMAIL"

              if git -C "$INFRA_DIR" diff --quiet -- "$RESOLVED_INFRA_VALUES_PATH"; then
                echo "No infra change detected."
                exit 0
              fi

              git -C "$INFRA_DIR" add "$RESOLVED_INFRA_VALUES_PATH"
              git -C "$INFRA_DIR" commit -m "ci(frontend): deploy ${RESOLVED_IMAGE_TAG}"
              git -C "$INFRA_DIR" push origin "HEAD:$RESOLVED_INFRA_BRANCH"
            '''
          }
        }
      }
    }
  }
}
