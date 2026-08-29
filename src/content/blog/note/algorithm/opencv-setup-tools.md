---
link: note/algorithm/opencv-setup-tools
title: "OpenCV 环境搭建：安装必要的开发工具与库"
date: 2026-08-30
categories: ['笔记', '算法']
---
#### **第 1 步：安装必要的开发工具和库**


我们需要 C++ 编译器、项目构建工具 (CMake) 和核心的图像处理库 (OpenCV)。

在终端中输入以下命令：


```plain
sudo pacman -S base-devel cmake opencv
```

- `base-devel`: 这是一个软件包组，包含了 `gcc` (C++ 编译器), `make` (编译工具) 等一系列最基础的开发工具。
- `cmake`: 一个跨平台的项目构建工具，它能读取我们后续编写的配置文件 (`CMakeLists.txt`) 并生成 `make` 所需的 `Makefile`。
- `opencv`: 我们项目最核心的依赖库，提供了所有图像处理和人脸识别的功能。


#### **第 2 步：创建项目文件夹结构**


现在，我们需要为项目创建一个干净整洁的工作空间。

1. **创建一个主文件夹**。我们把它放在您的主目录 (`~`) 下，并命名为 `FaceRecProject`。

   Bash

   ```plain
   # cd ~ 会确保您当前在主目录下
   cd ~
   mkdir FaceRecProject
   ```

2. **进入这个主文件夹**。之后的所有操作都在这里进行。

   Bash

   ```plain
   cd FaceRecProject
   ```

3. **创建项目所需的子文件夹**。

   Bash

   ```plain
   mkdir build
   mkdir data
   mkdir cascades
   ```

   - `build`: 用于存放所有编译过程中产生的临时文件和最终生成的可执行程序，让主目录保持干净。
   - `data`: 用于存放我们提供给程序学习的人脸照片。
   - `cascades`: 用于存放 OpenCV 官方提供的人脸检测模型文件。


#### **第 3 步：下载人脸检测模型**


我们需要一个预训练好的模型来告诉程序“人脸长什么样”。

在终端中（确保您仍在 `FaceRecProject` 文件夹下），运行以下命令：


```plain
wget -P ./cascades https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_alt.xml
```

- `wget`: 一个从网络上下载文件的命令行工具。
- `-P ./cascades`: `-P` 参数告诉 `wget` 把下载的文件放到指定的文件夹里，也就是我们刚创建的 `cascades` 文件夹。
- `https://...`: 这是模型文件的下载地址。


#### **第 4 步：编写项目代码**


现在我们要创建三个核心的文本文件：构建脚本和两个 C++ 源代码文件。

1. **创建构建脚本 `CMakeLists.txt`**

   Bash

   ```plain
   # 使用 nano 文本编辑器创建一个新文件
   nano CMakeLists.txt
   ```

   将下面的代码**完整地复制**并粘贴到 `nano` 编辑器窗口中：

   CMake

   ```plain
   cmake_minimum_required(VERSION 3.10)
   project(FaceRecognition)
   set(CMAKE_CXX_STANDARD 17)
   set(CMAKE_CXX_STANDARD_REQUIRED ON)
   find_package(OpenCV REQUIRED COMPONENTS core highgui imgproc objdetect videoio face)
   include_directories(${OpenCV_INCLUDE_DIRS})
   add_executable(train_model train_model.cpp)
   target_link_libraries(train_model ${OpenCV_LIBS} stdc++fs)
   add_executable(recognize_face recognize_face.cpp)
   target_link_libraries(recognize_face ${OpenCV_LIBS})
   ```

   粘贴完成后，按 `Ctrl+X`，然后按 `Y`，最后按 `回车` 来保存并退出。

2. **创建训练程序 `train_model.cpp`**

   Bash

   ```plain
   nano train_model.cpp
   ```

   将下面的代码**完整地复制**并粘贴进去：

   C++

   ```plain
   #include <iostream>
   #include <fstream>
   #include <sstream>
   #include <vector>
   #include <string>
   #include <filesystem>
   #include <opencv2/core.hpp>
   #include <opencv2/imgcodecs.hpp>
   #include <opencv2/imgproc.hpp>
   #include <opencv2/face.hpp>
   
   using namespace cv;
   using namespace cv::face;
   using namespace std;
   namespace fs = std::filesystem;
   
   void create_dataset_csv(const string& data_path, const string& output_file) {
       ofstream csv_file(output_file);
       int label = 0;
       for (const auto& entry : fs::directory_iterator(data_path)) {
           if (entry.is_directory()) {
               for (const auto& img_entry : fs::directory_iterator(entry.path())) {
                   if (img_entry.is_regular_file()) {
                       csv_file << img_entry.path().string() << ";" << label << endl;
                   }
               }
               label++;
           }
       }
       csv_file.close();
       cout << "Dataset CSV file created at " << output_file << endl;
   }
   
   static void read_csv(const string& filename, vector<Mat>& images, vector<int>& labels, char separator = ';') {
       ifstream file(filename.c_str(), ifstream::in);
       string line, path, classlabel;
       while (getline(file, line)) {
           stringstream liness(line);
           getline(liness, path, separator);
           getline(liness, classlabel);
           if(!path.empty() && !classlabel.empty()) {
               images.push_back(imread(path, IMREAD_GRAYSCALE));
               labels.push_back(atoi(classlabel.c_str()));
           }
       }
   }
   
   int main() {
       string data_dir = "./data";
       string csv_file_path = "./data.csv";
       create_dataset_csv(data_dir, csv_file_path);
   
       vector<Mat> images;
       vector<int> labels;
       try {
           read_csv(csv_file_path, images, labels);
       } catch (const cv::Exception& e) {
           cerr << "Error opening file \"" << csv_file_path << "\". Reason: " << e.msg << endl;
           exit(1);
       }
       if(images.size() <= 1) {
           cerr << "Error: This program needs at least 2 images to train. Please add more images to your data directory." << endl;
           exit(1);
       }
   
       Ptr<LBPHFaceRecognizer> model = LBPHFaceRecognizer::create();
       cout << "Training the model..." << endl;
       model->train(images, labels);
       string model_filename = "face_model.yml";
       model->save(model_filename);
       cout << "Model trained and saved to " << model_filename << endl;
       return 0;
   }
   ```

   同样按 `Ctrl+X`, `Y`, `回车` 保存退出。

3. **创建识别程序 `recognize_face.cpp`**

   Bash

   ```plain
   nano recognize_face.cpp
   ```

   将下面的代码**完整地复制**并粘贴进去：

   C++

   ```plain
   #include <iostream>
   #include <map>
   #include <string>
   #include <filesystem>
   #include <chrono>
   #include <iomanip>
   #include <sstream>
   #include <opencv2/core.hpp>
   #include <opencv2/highgui.hpp>
   #include <opencv2/imgproc.hpp>
   #include <opencv2/objdetect.hpp>
   #include <opencv2/face.hpp>
   
   using namespace std;
   using namespace cv;
   using namespace cv::face;
   namespace fs = std::filesystem;
   
   int main() {
       string cascade_path = "./cascades/haarcascade_frontalface_alt.xml";
       string model_path = "face_model.yml";
       CascadeClassifier face_cascade;
       if (!face_cascade.load(cascade_path)) {
           cerr << "Error: Could not load face cascade." << endl;
           return -1;
       }
   
       Ptr<FaceRecognizer> model = LBPHFaceRecognizer::create();
       try {
           model->read(model_path);
       } catch (const cv::Exception& e) {
           cerr << "Error: Could not load trained model. Have you trained the model yet?" << endl;
           return -1;
       }
   
       map<int, string> label_to_name;
       label_to_name[0] = "Person 1"; // 可在此处修改识别出的名字
       label_to_name[1] = "Person 2";
   
       string strangers_dir = "strangers";
       if (!fs::exists(strangers_dir)) {
           fs::create_directory(strangers_dir);
       }
       auto last_stranger_save_time = chrono::steady_clock::now();
       const auto save_cooldown = chrono::seconds(5);
   
       VideoCapture cap(0);
       if (!cap.isOpened()) {
           cerr << "Error: Could not open camera." << endl;
           return -1;
       }
   
       Mat frame;
       while (true) {
           cap >> frame;
           if (frame.empty()) break;
   
           Mat gray;
           cvtColor(frame, gray, COLOR_BGR2GRAY);
           equalizeHist(gray, gray);
   
           vector<Rect> faces;
           face_cascade.detectMultiScale(gray, faces, 1.1, 4, 0|CASCADE_SCALE_IMAGE, Size(30, 30));
   
           for (const auto& face_rect : faces) {
               Mat face_roi = gray(face_rect);
               Mat resized_face;
               resize(face_roi, resized_face, Size(92, 112), 1.0, 1.0, INTER_CUBIC);
   
               int predicted_label = -1;
               double confidence = 0.0;
               model->predict(resized_face, predicted_label, confidence);
   
               rectangle(frame, face_rect, Scalar(0, 255, 0), 2);
   
               string text;
               if (predicted_label != -1 && confidence < 85.0) {
                    string name = label_to_name.count(predicted_label) ? label_to_name[predicted_label] : "Known Person";
                    text = format("%s (Conf: %.2f)", name.c_str(), confidence);
               } else {
                   text = "Stranger";
                   auto now = chrono::steady_clock::now();
                   if (chrono::duration_cast<chrono::seconds>(now - last_stranger_save_time) > save_cooldown) {
                       auto time_now_t = chrono::system_clock::to_time_t(chrono::system_clock::now());
                       stringstream ss;
                       ss << put_time(localtime(&time_now_t), "%Y%m%d_%H%M%S");
                       string filename = strangers_dir + "/stranger_" + ss.str() + ".jpg";
                       imwrite(filename, frame(face_rect));
                       cout << "Stranger detected! Image saved to " << filename << endl;
                       last_stranger_save_time = now;
                   }
               }
   
               Point text_pos(face_rect.x, face_rect.y - 10);
               putText(frame, text, text_pos, FONT_HERSHEY_SIMPLEX, 0.6, Scalar(0, 255, 0), 2);
           }
   
           imshow("Face Recognition", frame);
   
           if (waitKey(10) == 'q') break;
       }
       return 0;
   }
   ```

   按 `Ctrl+X`, `Y`, `回车` 保存退出。


#### **第 5 步：准备训练数据**


这是教程序认识人脸的关键。

1. 在 `data` 文件夹里，**为每一个人创建一个单独的子文件夹**。文件夹的名字最好是英文，比如 `zhangsan`, `lisi`。

   Bash

   ```plain
   # 例如，创建两个人的文件夹
   mkdir data/zhangsan
   mkdir data/lisi
   ```

2. 将每个人的照片（JPG 或 PNG 格式）放入对应的文件夹。每个人的照片建议至少 10 张，越多越好，最好包含不同角度、不同表情、不同光线下的照片。

   您可以用文件管理器来复制粘贴，或者用 cp 命令。


#### **第 6 步：编译项目**


现在，所有代码和数据都准备好了，让我们来编译它。

1. **进入 `build` 文件夹**。

   Bash

   ```plain
   cd build
   ```

2. **运行 CMake**。它会读取上一级目录的 `CMakeLists.txt` 文件并生成配置。

   Bash

   ```plain
   cmake ..
   ```

   - `..` 代表上一级目录。

3. **运行 make**。它会根据 CMake 生成的配置，调用 C++ 编译器来编译源代码。

   Bash

   ```plain
   make
   ```

   等待编译完成。如果一切顺利，您不会看到任何红色的错误信息。


#### **第 7 步：运行程序**


编译成功后，`build` 文件夹里会生成两个可执行文件：`train_model` 和 `recognize_face`。

1. **首先，训练模型**。我们需要回到项目主目录来运行，这样程序才能找到 `data` 文件夹。

   Bash

   ```plain
   # 回到主目录 FaceRecProject
   cd ..
   
   # 运行训练程序
   ./build/train_model
   ```

   程序会读取 `data` 文件夹里的照片，训练模型，然后在主目录生成一个 `face_model.yml` 文件。

2. **最后，运行实时识别程序**！

   Bash

   ```plain
   # 确保仍在主目录
   ./build/recognize_face
   ```

   程序会请求打开您的摄像头。授权后，一个名为 “Face Recognition” 的窗口就会弹出。它会实时地检测和识别人脸，并将陌生人的头像保存在 `strangers` 文件夹。

   **按 `q` 键可以关闭窗口并退出程序。**

恭喜！你已经从零开始，成功地在 Arch Linux 上构建并运行了一个属于您自己的 C++ 人脸识别应用。
