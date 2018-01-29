
declare -a suites=(
  "fh-art"
  "mbaas-art"
  "fh-uart"
)

# remove temp dir if it exists
if [ -d "temp" ]; then
  rm -rf temp
fi

# build docker images for test suites
for suite in "${suites[@]}"
do
  # if "-f" parameter was passed rebuild image even if it already exists
  if [ "$1" = "-f" ]; then
    $DOCKER_SUDO docker rmi load-test-${suite}
  fi

  # skip if docker image with test suite already exists
  if $DOCKER_SUDO docker images | grep load-test-${suite} >/dev/null; then
    echo "Image for ${suite} already exists -> skipping"
    continue
  fi

  echo "Creating docker image for ${suite}..."

  # create temp dir
  mkdir temp
  cd temp

  # clone fh-art repo
  if ! git clone git@github.com:fheng/${suite}.git >/dev/null; then
    continue
  fi

  # build docker image for test suite
  echo "Building docker image..."
  cp ../dockerfiles/${suite} ./Dockerfile
  $DOCKER_SUDO docker build -t load-test-${suite} . #>/dev/null

  # remove temp dir
  cd ..
  rm -rf temp
done