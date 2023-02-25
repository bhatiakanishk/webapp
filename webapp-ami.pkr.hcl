packer {
  required_plugins {
    amazon = {
      version = ">= 0.0.2"
      source  = "github.com/hashicorp/packer-plugin-amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "source_ami" {
  type    = string
  default = "ami-0dfcb1ef8550277af"
}

variable "ssh_username" {
  type    = string
  default = "ec2-user"
}

variable "subnet_id" {
  type    = string
  default = "subnet-0f9d10244e5b12fd8"
}

source "amazon-ebs" "linux2" {
  ami_name      = "amazon-linux-2"
  ami_users     = ["936367200870"]
  instance_type = "t2.micro"
  region        = "${var.aws_region}"
  vpc_id        = "vpc-096db90b7230c22d8"
  subnet_id     = "${var.subnet_id}"
  source_ami_filter {
    filters = {
      name                = "amzn2-ami-hvm-2.0.*-x86_64-ebs"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
      hypervisor          = "xen"
    }
    most_recent = true
    owners      = ["amazon"]
  }
  ssh_username = "${var.ssh_username}"
}

build {
  name = "amazon-linux-2"
  sources = [
    "source.amazon-ebs.linux2"
  ]
  provisioner "file" {
    source      = "index.js"
    destination = "/home/ec2-user/"
  }
  provisioner "file" {
    source      = "package.json"
    destination = "/home/ec2-user/"
  }
  provisioner "file" {
    source      = "server.d.ts"
    destination = "/home/ec2-user/"
  }
  provisioner "file" {
    source      = "server.service"
    destination = "/home/ec2-user/"
  }

  provisioner "shell" {
    environment_vars = [
      "DEBIAN_FRONTEND=noninteractive",
      "CHECKPOINT_DISABLE=1"
    ]
    script = "install.bash"
  }
}

