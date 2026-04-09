pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'IMAGE_TAG', defaultValue: '', description: '비우면 현재 git sha short 값을 사용합니다.')
    string(name: 'DOCKER_IMAGE_REPOSITORY', defaultValue: 'docker.io/spotifyyyyy/chat-frontend', description: '푸시할 Docker 이미지 repository')
    string(name: 'INFRA_REPO_URL', defaultValue: 'git@github.com:xcdev-0/chat-platform-infra.git', description: 'Helm values를 관리하는 infra 저장소 URL')
    string(name: 'INFRA_BRANCH', defaultValue: 'main', description: 'infra 저장소 브랜치')
    string(name: 'INFRA_VALUES_PATH', defaultValue: 'environments/dev/frontend-values.yaml', description: '업데이트할 values 파일 경로')
  }

  environment {
    DOCKERHUB_CREDENTIALS_ID = 'dockerhub-credentials'
    INFRA_DIR = "${WORKSPACE}/.infra-repo"
    GIT_COMMITTER_NAME = 'Jenkins'
    GIT_COMMITTER_EMAIL = 'jenkins@kube.com'
  }

  stages {
    stage('Prepare') {
      steps {
        script {
          env.RESOLVED_IMAGE_TAG = params.IMAGE_TAG?.trim()
            ? params.IMAGE_TAG.trim()
            : sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()
        }
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Docker Build') {
      steps {
        sh "docker build -t ${params.DOCKER_IMAGE_REPOSITORY}:${env.RESOLVED_IMAGE_TAG} ."
      }
    }

    stage('Docker Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
          sh '''
            echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin docker.io
            docker push "${DOCKER_IMAGE_REPOSITORY}:${RESOLVED_IMAGE_TAG}"
            docker logout docker.io
          '''
        }
      }
    }

    stage('Update Infra Repo') {
      steps {
        sshagent(credentials: ['github-ssh']) {
          sh '''
            rm -rf "$INFRA_DIR"
            git clone --depth 1 --branch "$INFRA_BRANCH" "$INFRA_REPO_URL" "$INFRA_DIR"

            sh "$INFRA_DIR/cicd/update_image_tag.sh" \
              "$INFRA_DIR/$INFRA_VALUES_PATH" \
              "$DOCKER_IMAGE_REPOSITORY" \
              "$RESOLVED_IMAGE_TAG"

            git -C "$INFRA_DIR" config user.name "$GIT_COMMITTER_NAME"
            git -C "$INFRA_DIR" config user.email "$GIT_COMMITTER_EMAIL"

            if git -C "$INFRA_DIR" diff --quiet -- "$INFRA_VALUES_PATH"; then
              echo "No infra change detected."
              exit 0
            fi

            git -C "$INFRA_DIR" add "$INFRA_VALUES_PATH"
            git -C "$INFRA_DIR" commit -m "ci(frontend): deploy ${RESOLVED_IMAGE_TAG}"
            git -C "$INFRA_DIR" push origin "HEAD:$INFRA_BRANCH"
          '''
        }
      }
    }
  }
}
